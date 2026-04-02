const redis = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');
const {
  AUTH_CONSUMER_GROUP,
  AUTH_DLQ_STREAM,
  AUTH_STREAM,
  PROCESSED_TTL_SECONDS,
  ensureConsumerGroup,
  getConsumerHealth,
  getStreamInfo,
  inspectPendingEntries,
  parseReadGroupResponse,
  serializeStreamEvent,
  validateAuthEvent,
} = require('../utils/authStream');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithConcurrency(items, limit, handler) {
  const active = new Set();

  for (const item of items) {
    const task = Promise.resolve()
      .then(() => handler(item))
      .finally(() => active.delete(task));

    active.add(task);

    if (active.size >= limit) {
      await Promise.race(active);
    }
  }

  await Promise.allSettled(active);
}

async function defaultProcessor({ event, redisClient }) {
  await redisClient
    .multi()
    .hincrby('metrics:auth:events', event.event, 1)
    .hincrby(`metrics:auth:roles:${event.role}`, 'count', 1)
    .set('metrics:auth:lastProcessedAt', String(Date.now()))
    .exec();
}

function createAuthStreamWorker({
  redisClient = redis,
  readerClient = redis.duplicate(),
  processor = defaultProcessor,
  instanceId = process.env.HOSTNAME || process.pid,
  stream = AUTH_STREAM,
  group = AUTH_CONSUMER_GROUP,
  dlqStream = AUTH_DLQ_STREAM,
  batchSize = env.authStreamBatchSize,
  blockMs = env.authStreamBlockMs,
  pollIntervalMs = env.authStreamPollIntervalMs,
  concurrency = env.authStreamConcurrency,
  maxRetries = env.authStreamMaxRetries,
  claimIdleMs = env.authStreamClaimIdleMs,
  sleepFn = sleep,
} = {}) {
  const consumerName = `${group}-${instanceId}`;
  let stopped = false;

  function processedKey(eventId) {
    return `processed:${eventId}`;
  }

  function getLogicalEventId(event) {
    return event.originalEventId || event.id;
  }

  function computeRetryDelay(retryCount) {
    return Math.min(1000 * (2 ** Math.max(0, retryCount)), 30000);
  }

  async function acknowledge(messageId) {
    await redisClient.xack(stream, group, messageId);
  }

  async function pushToDlq(event, error, retryCount, logicalEventId = getLogicalEventId(event)) {
    await redisClient.xadd(
      dlqStream,
      'MAXLEN', '~', '50000',
      '*',
      ...serializeStreamEvent(event, {
        originalEventId: logicalEventId,
        retryCount,
        failedAt: Date.now(),
        errorMessage: error.message,
      }),
    );
    logger.error('authStreamWorker: pushed event to DLQ', {
      eventId: event.id,
      originalEventId: logicalEventId,
      retryCount,
      error,
    });
  }

  async function requeue(event, retryCount, logicalEventId = getLogicalEventId(event)) {
    const delayMs = computeRetryDelay(retryCount - 1);
    await sleepFn(delayMs);
    await redisClient.xadd(
      stream,
      'MAXLEN', '~', '50000',
      '*',
      ...serializeStreamEvent(event, {
        retryCount,
        originalEventId: logicalEventId,
        availableAt: Date.now() + delayMs,
      }),
    );
    logger.warn('authStreamWorker: requeued event for retry', {
      eventId: event.id,
      originalEventId: logicalEventId,
      retryCount,
      delayMs,
    });
  }

  async function recoverStaleMessages() {
    const pendingEntries = await inspectPendingEntries(redisClient, {
      stream,
      group,
      count: batchSize,
    });
    const staleIds = pendingEntries
      .filter((entry) => entry.idleMs >= claimIdleMs)
      .map((entry) => entry.id);

    if (staleIds.length === 0) {
      return [];
    }

    const claimed = await redisClient.xclaim(stream, group, consumerName, claimIdleMs, ...staleIds);
    logger.warn('authStreamWorker: claimed stale messages', {
      consumerName,
      count: staleIds.length,
    });
    return parseReadGroupResponse([[stream, claimed]]);
  }

  async function processOne(event) {
    const validation = validateAuthEvent(event);
    const logicalEventId = getLogicalEventId(event);

    if (!validation.valid) {
      await pushToDlq(event, new Error('invalid_auth_event_schema'), event.retryCount, logicalEventId);
      await acknowledge(event.id);
      return;
    }

    const processed = await redisClient.get(processedKey(logicalEventId));
    if (processed) {
      await acknowledge(event.id);
      logger.info('authStreamWorker: skipped already processed event', {
        eventId: event.id,
        originalEventId: logicalEventId,
      });
      return;
    }

    try {
      await processor({
        event: validation.event,
        eventId: event.id,
        originalEventId: logicalEventId,
        retryCount: event.retryCount,
        consumerName,
        redisClient,
      });
      await redisClient.set(
        processedKey(logicalEventId),
        JSON.stringify({ processedAt: Date.now(), consumerName }),
        'EX',
        PROCESSED_TTL_SECONDS,
        'NX',
      );
      await acknowledge(event.id);
      logger.info('authStreamWorker: processed auth event', {
        eventId: event.id,
        originalEventId: logicalEventId,
        event: validation.event.event,
        retryCount: event.retryCount,
      });
    } catch (error) {
      const nextRetryCount = event.retryCount + 1;
      if (nextRetryCount > maxRetries) {
        await pushToDlq(validation.event, error, nextRetryCount, logicalEventId);
        await acknowledge(event.id);
        return;
      }

      await requeue(validation.event, nextRetryCount, logicalEventId);
      await acknowledge(event.id);
      logger.warn('authStreamWorker: failed processing auth event', {
        eventId: event.id,
        originalEventId: logicalEventId,
        retryCount: nextRetryCount,
        error,
      });
    }
  }

  async function readNewMessages() {
    const response = await readerClient.xreadgroup(
      'GROUP',
      group,
      consumerName,
      'COUNT',
      batchSize,
      'BLOCK',
      blockMs,
      'STREAMS',
      stream,
      '>',
    );

    return parseReadGroupResponse(response || []);
  }

  async function pollOnce() {
    const recovered = await recoverStaleMessages();
    const fresh = await readNewMessages();
    const events = [...recovered, ...fresh];

    if (events.length === 0) {
      if (pollIntervalMs > 0) {
        await sleepFn(pollIntervalMs);
      }
      return 0;
    }

    await runWithConcurrency(events, Math.max(1, concurrency), processOne);
    return events.length;
  }

  async function start() {
    await ensureConsumerGroup(redisClient, stream, group);
    logger.info('authStreamWorker: worker started', {
      stream,
      group,
      consumerName,
      batchSize,
      concurrency,
      maxRetries,
    });

    while (!stopped) {
      try {
        await pollOnce();
      } catch (error) {
        logger.error('authStreamWorker: polling failed', { error, consumerName });
        await sleepFn(Math.max(pollIntervalMs, 1000));
      }
    }
  }

  async function stop() {
    stopped = true;
    await Promise.allSettled([
      readerClient.quit?.(),
    ]);
  }

  return {
    consumerName,
    getConsumerHealth: () => getConsumerHealth(redisClient, stream, group),
    getStreamInfo: () => getStreamInfo(redisClient, stream, group),
    pollOnce,
    start,
    stop,
  };
}

if (require.main === module) {
  const worker = createAuthStreamWorker();
  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, async () => {
      await worker.stop();
      process.exit(0);
    });
  });

  worker.start().catch(async (error) => {
    logger.error('authStreamWorker: fatal startup failure', { error });
    await worker.stop();
    process.exit(1);
  });
}

module.exports = {
  createAuthStreamWorker,
  defaultProcessor,
};
