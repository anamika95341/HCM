const redis = require('../config/redis');

function createLimiter({ windowSeconds, max, prefix, skip, identifierResolver }) {
  return async function limit(req, res, next) {
    try {
      if (typeof skip === 'function' && skip(req)) {
        return next();
      }

      const identifier = typeof identifierResolver === 'function'
        ? identifierResolver(req)
        : (req.user?.sub || req.ip);

      const normalizedIdentifier = String(identifier || req.ip || 'anonymous');
      const key = `ratelimit:${prefix}:${normalizedIdentifier}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      if (count > max) {
        res.setHeader('Retry-After', String(windowSeconds));
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
      return next();
    } catch (error) {
      return next();
    }
  };
}

function authIdentifier(req) {
  const body = req.body || {};
  return body.usernameOrEmail || body.citizenId || body.email || req.ip;
}

function hasBearerAuthHeader(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  return typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
}

module.exports = {
  general: createLimiter({
    windowSeconds: 60,
    max: 240,
    prefix: 'general',
    skip: (req) => (
      req.method === 'OPTIONS'
      || req.path === '/health'
      || ((req.method === 'GET' || req.method === 'HEAD') && hasBearerAuthHeader(req))
    ),
  }),
  auth: createLimiter({
    windowSeconds: 60,
    max: 8,
    prefix: 'auth',
    identifierResolver: authIdentifier,
  }),
  uploads: createLimiter({ windowSeconds: 60, max: 12, prefix: 'upload' }),
};
