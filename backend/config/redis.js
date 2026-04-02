const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redisOptions = {
  lazyConnect: false,
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  retryStrategy(times) {
    return Math.min(50 * (2 ** times), 2000);
  },
};

function createRedisClient(overrides = {}) {
  return new Redis(env.redisUrl, {
    ...redisOptions,
    ...overrides,
  });
}

const redis = createRedisClient();

redis.on('error', (error) => {
  logger.error('Redis client error', { error });
});

module.exports = redis;
module.exports.createRedisClient = createRedisClient;
module.exports.redisOptions = redisOptions;
