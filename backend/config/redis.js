const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redis = new Redis(env.redisUrl, {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  retryStrategy(times) {
    return Math.min(50 * (2 ** times), 2000);
  },
});

redis.on('error', (error) => {
  logger.error('Redis client error', { error });
});

module.exports = redis;
