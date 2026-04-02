jest.mock('../config/redis', () => ({
  incr: jest.fn(),
  expire: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
}));

const redis = require('../config/redis');
const logger = require('../utils/logger');
const rateLimiter = require('../middleware/rateLimiter');

describe('rateLimiter Redis resilience', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calls next() when Redis incr throws', async () => {
    redis.incr.mockRejectedValue(new Error('redis down'));
    const req = { method: 'POST', path: '/auth/login', user: null, ip: '127.0.0.1', body: {} };
    const res = {};
    const next = jest.fn();

    await rateLimiter.auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).toBeUndefined();
  });

  test('logs a warning when Redis incr throws', async () => {
    redis.incr.mockRejectedValue(new Error('redis down'));
    const req = { method: 'POST', path: '/auth/login', user: null, ip: '127.0.0.1', body: {} };
    const res = {};
    const next = jest.fn();

    await rateLimiter.auth(req, res, next);

    expect(logger.warn).toHaveBeenCalledWith(
      'Rate limiter Redis unavailable, bypassing',
      expect.objectContaining({ error: 'redis down' }),
    );
  });
});
