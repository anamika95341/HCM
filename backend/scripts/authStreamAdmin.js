const redis = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');
const {
  AUTH_CONSUMER_GROUP,
  AUTH_STREAM,
  getConsumerHealth,
  getStreamInfo,
  inspectPendingEntries,
  replayAuthEvents,
  requeueDlqToMain,
} = require('../utils/authStream');

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command) {
    throw new Error('Usage: node scripts/authStreamAdmin.js <info|pending|replay|requeue-dlq>');
  }

  if (command === 'info') {
    const [streamInfo, consumerHealth] = await Promise.all([
      getStreamInfo(redis, AUTH_STREAM, AUTH_CONSUMER_GROUP),
      getConsumerHealth(redis, AUTH_STREAM, AUTH_CONSUMER_GROUP),
    ]);
    console.log(JSON.stringify({ streamInfo, consumerHealth }, null, 2));
    return;
  }

  if (command === 'pending') {
    const [countArg, consumer] = args;
    const result = await inspectPendingEntries(redis, {
      stream: AUTH_STREAM,
      group: AUTH_CONSUMER_GROUP,
      count: Number(countArg || 25),
      consumer,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'replay') {
    const [fromId = '0-0', countArg, sourceStream] = args;
    const result = await replayAuthEvents(redis, {
      fromId,
      count: Number(countArg || env.authStreamReplayBatchSize),
      sourceStream,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'requeue-dlq') {
    const [fromId = '0-0', countArg] = args;
    const result = await requeueDlqToMain(redis, {
      fromId,
      count: Number(countArg || env.authStreamReplayBatchSize),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main()
  .catch((error) => {
    logger.error('authStreamAdmin: command failed', { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await redis.quit();
  });
