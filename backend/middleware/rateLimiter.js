const redis = require('../config/redis');

function createLimiter({ windowSeconds, max, prefix }) {
  return async function limit(req, res, next) {
    try {
      const identifier = req.user?.sub || req.ip;
      const key = `ratelimit:${prefix}:${identifier}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      if (count > max) {
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
      return next();
    } catch (error) {
      return next();
    }
  };
}

module.exports = {
  general: createLimiter({ windowSeconds: 60, max: 60, prefix: 'general' }),
  auth: createLimiter({ windowSeconds: 60, max: 5, prefix: 'auth' }),
  uploads: createLimiter({ windowSeconds: 60, max: 10, prefix: 'upload' }),
};
