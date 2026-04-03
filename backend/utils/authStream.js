const crypto = require('crypto');
const logger = require('./logger');

const AUTH_STREAM = 'auth';
const AUTH_DLQ_STREAM = 'auth:events';
const AUTH_CONSUMER_GROUP = 'auth-monitor';
const AUTH_STREAM_MAXLEN = 50000;
const AUTH_STREAM_VERSION = 'v1';
const PROCESSED_TTL_SECONDS = 24 * 60 * 60;

function maskIp(ip) {
  if (!ip) {
    return '';
  }

  if (String(ip).startsWith('sha256:')) {
    return String(ip);
  }

  return `sha256:${crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16)}`;
}

function toOptionalString(value) {
  return value == null ? '' : String(value);
}

function normalizeAuthEvent(payload = {}) {
  return {
    version: AUTH_STREAM_VERSION,
    event: toOptionalString(payload.event),
    userId: toOptionalString(payload.userId),
    role: toOptionalString(payload.role),
    ip: maskIp(payload.ip),
    reason: toOptionalString(payload.reason),
    requestId: toOptionalString(payload.requestId),
    ts: Number(payload.ts || Date.now()),
  };
}

function validateAuthEvent(payload = {}) {
  const event = normalizeAuthEvent(payload);
  const valid = (
    event.version === AUTH_STREAM_VERSION
    && event.event.length > 0
    && event.userId.length > 0
    && event.role.length > 0
    && event.ip.length > 0
    && Number.isFinite(event.ts)
    && event.ts > 0
  );

  if (!valid) {
    return {
      valid: false,
      errors: {
        version: event.version === AUTH_STREAM_VERSION,
        event: event.event.length > 0,
        userId: event.userId.length > 0,
        role: event.role.length > 0,
        ip: event.ip.length > 0,
        ts: Number.isFinite(event.ts) && event.ts > 0,
      },
      event,
    };
  }

  return { valid: true, event };
}

function serializeStreamEvent(event, extra = {}) {
  const fields = {
    version: event.version,
    event: event.event,
    userId: event.userId,
    role: event.role,
    ip: event.ip,
    reason: toOptionalString(event.reason),
    requestId: toOptionalString(event.requestId),
    ts: String(event.ts),
  };

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined) {
      fields[key] = toOptionalString(value);
    }
  });

  return Object.entries(fields).flatMap(([key, value]) => [key, value]);
}

function parseStreamMessage(messageId, fieldList = []) {
  const raw = {};
  for (let index = 0; index < fieldList.length; index += 2) {
    raw[fieldList[index]] = fieldList[index + 1];
  }

  return {
    id: messageId,
    version: raw.version || AUTH_STREAM_VERSION,
    event: raw.event || '',
    userId: raw.userId || '',
    role: raw.role || '',
    ip: raw.ip || '',
    reason: raw.reason || '',
    requestId: raw.requestId || '',
    ts: Number(raw.ts || 0),
    retryCount: Number(raw.retryCount || 0),
    originalEventId: raw.originalEventId || '',
    availableAt: Number(raw.availableAt || 0),
    raw,
  };
}

function parseReadGroupResponse(response = []) {
  return response.flatMap((streamEntry) => {
    const [, messages] = streamEntry;
    return (messages || []).map(([messageId, fieldList]) => parseStreamMessage(messageId, fieldList));
  });
}

async function ensureConsumerGroup(redis, stream = AUTH_STREAM, group = AUTH_CONSUMER_GROUP) {
  try {
    await redis.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
  } catch (error) {
    if (!String(error?.message || '').includes('BUSYGROUP')) {
      throw error;
    }
  }
}

async function publishAuthEvent(redis, payload = {}) {
  const validation = validateAuthEvent(payload);

  if (!validation.valid) {
    logger.warn('authStream: rejected invalid auth event', {
      payload,
      errors: validation.errors,
    });
    return null;
  }

  try {
    return await redis.xadd(
      AUTH_STREAM,
      'MAXLEN', '~', String(AUTH_STREAM_MAXLEN),
      '*',
      ...serializeStreamEvent(validation.event),
    );
  } catch (error) {
    logger.warn('authStream: failed to publish auth event', {
      event: validation.event.event,
      role: validation.event.role,
      userId: validation.event.userId,
      error,
    });
    return null;
  }
}

async function getPendingSummary(redis, stream = AUTH_STREAM, group = AUTH_CONSUMER_GROUP) {
  try {
    const pending = await redis.xpending(stream, group);
    if (!Array.isArray(pending)) {
      return { total: 0, smallestId: null, greatestId: null, consumers: [] };
    }

    return {
      total: Number(pending[0] || 0),
      smallestId: pending[1] || null,
      greatestId: pending[2] || null,
      consumers: Array.isArray(pending[3])
        ? pending[3].map(([name, count]) => ({ name, pending: Number(count || 0) }))
        : [],
    };
  } catch (error) {
    if (String(error?.message || '').includes('NOGROUP')) {
      return { total: 0, smallestId: null, greatestId: null, consumers: [] };
    }
    throw error;
  }
}

async function getStreamInfo(redis, stream = AUTH_STREAM, group = AUTH_CONSUMER_GROUP) {
  const [streamLength, dlqLength, pending] = await Promise.all([
    redis.xlen(stream),
    redis.xlen(AUTH_DLQ_STREAM),
    getPendingSummary(redis, stream, group),
  ]);

  return {
    stream,
    group,
    dlqStream: AUTH_DLQ_STREAM,
    streamLength: Number(streamLength || 0),
    dlqLength: Number(dlqLength || 0),
    pending,
  };
}

async function getConsumerHealth(redis, stream = AUTH_STREAM, group = AUTH_CONSUMER_GROUP) {
  try {
    const [groups, consumers] = await Promise.all([
      redis.call('XINFO', 'GROUPS', stream),
      redis.call('XINFO', 'CONSUMERS', stream, group),
    ]);

    return {
      groups: Array.isArray(groups)
        ? groups.map((entry) => Object.fromEntries(entry.map((value, index, list) => index % 2 === 0 ? [String(value), list[index + 1]] : null).filter(Boolean)))
        : [],
      consumers: Array.isArray(consumers)
        ? consumers.map((entry) => Object.fromEntries(entry.map((value, index, list) => index % 2 === 0 ? [String(value), list[index + 1]] : null).filter(Boolean)))
        : [],
    };
  } catch (error) {
    if (String(error?.message || '').includes('NOGROUP')) {
      return { groups: [], consumers: [] };
    }
    throw error;
  }
}

async function inspectPendingEntries(redis, {
  stream = AUTH_STREAM,
  group = AUTH_CONSUMER_GROUP,
  start = '-',
  end = '+',
  count = 25,
  consumer,
} = {}) {
  try {
    const rows = consumer
      ? await redis.xpending(stream, group, start, end, count, consumer)
      : await redis.xpending(stream, group, start, end, count);

    return Array.isArray(rows)
      ? rows.map(([id, owner, idleMs, deliveries]) => ({
        id,
        owner,
        idleMs: Number(idleMs || 0),
        deliveries: Number(deliveries || 0),
      }))
      : [];
  } catch (error) {
    if (String(error?.message || '').includes('NOGROUP')) {
      return [];
    }
    throw error;
  }
}

async function replayAuthEvents(redis, {
  sourceStream = AUTH_DLQ_STREAM,
  destinationStream = AUTH_STREAM,
  fromId = '0-0',
  count = 100,
} = {}) {
  const entries = await redis.xrange(sourceStream, fromId, '+', 'COUNT', count);
  let replayed = 0;

  for (const [messageId, fieldList] of entries || []) {
    const parsed = parseStreamMessage(messageId, fieldList);
    const validation = validateAuthEvent(parsed);
    if (!validation.valid) {
      logger.warn('authStream: skipping replay for invalid payload', {
        messageId,
        sourceStream,
        errors: validation.errors,
      });
      continue;
    }

    await redis.xadd(
      destinationStream,
      'MAXLEN', '~', String(AUTH_STREAM_MAXLEN),
      '*',
      ...serializeStreamEvent(validation.event, {
        retryCount: parsed.retryCount,
        originalEventId: parsed.originalEventId || parsed.id,
      }),
    );
    replayed += 1;
  }

  return { sourceStream, destinationStream, replayed };
}

async function requeueDlqToMain(redis, options = {}) {
  return replayAuthEvents(redis, {
    sourceStream: AUTH_DLQ_STREAM,
    destinationStream: AUTH_STREAM,
    ...options,
  });
}

module.exports = {
  AUTH_STREAM,
  AUTH_DLQ_STREAM,
  AUTH_CONSUMER_GROUP,
  AUTH_STREAM_MAXLEN,
  AUTH_STREAM_VERSION,
  PROCESSED_TTL_SECONDS,
  ensureConsumerGroup,
  getConsumerHealth,
  getStreamInfo,
  inspectPendingEntries,
  maskIp,
  normalizeAuthEvent,
  parseReadGroupResponse,
  parseStreamMessage,
  publishAuthEvent,
  replayAuthEvents,
  requeueDlqToMain,
  serializeStreamEvent,
  validateAuthEvent,
};
