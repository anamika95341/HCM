'use strict';

const redis = require('../config/redis');
const logger = require('../utils/logger');

// WHY: Per-process in-memory fallback so rate limiting continues when Redis is unavailable.
// Limitation: per-process only (not cross-cluster). Better than unlimited access during Redis outages.
const inMemoryCounters = new Map(); // key -> { count, resetAt }

function inMemoryIncr(key, windowSeconds) {
  const now = Date.now();
  const entry = inMemoryCounters.get(key);
  if (!entry || now >= entry.resetAt) {
    inMemoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

// Prune expired entries every 60s to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryCounters) {
    if (now >= entry.resetAt) inMemoryCounters.delete(key);
  }
}, 60_000).unref(); // .unref() so this timer doesn't prevent process exit

function createLimiter({ windowSeconds, max, prefix, skip, identifierResolver }) {
  return async function limit(req, res, next) {
    try {
      if (typeof skip === 'function' && skip(req)) return next();

      const identifier = typeof identifierResolver === 'function'
        ? identifierResolver(req)
        : (req.user?.sub || req.ip);

      const normalizedIdentifier = String(identifier || req.ip || 'anonymous');
      const key = `ratelimit:${prefix}:${normalizedIdentifier}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      if (count > max) {
        res.setHeader('Retry-After', String(windowSeconds));
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
      return next();
    } catch (error) {
      // WHY: Redis unavailable — fall back to per-process in-memory counter.
      // Not cross-cluster but better than unlimited access during Redis outages.
      logger.warn('Rate limiter Redis unavailable, using in-memory fallback', {
        prefix,
        error: error.message,
      });
      const fallbackKey = `${prefix}:${req.ip || 'anon'}`;
      const count = inMemoryIncr(fallbackKey, windowSeconds);
      if (count > max) {
        res.setHeader('Retry-After', String(windowSeconds));
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
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
