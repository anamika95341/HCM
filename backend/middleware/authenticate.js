const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
const authRepository = require('../modules/auth/auth.repository');
const { publishAuthEvent } = require('../utils/authStream');
const logger = require('../utils/logger');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
}

function getRequestId(req) {
  return req.get?.('x-request-id') || req.headers['x-request-id'];
}

function authenticate(expectedRole) {
  return async (req, res, next) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        logger.warn('Authentication failed', {
          reason: 'missing_bearer_token',
          expectedRole,
          path: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const expectedRoles = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
      let payload = null;
      let matchedRole = null;
      let lastError = null;

      for (const role of expectedRoles) {
        try {
          const config = getRoleConfig(role);
          payload = jwt.verify(token, config.publicKey, {
            algorithms: ['RS256'],
            audience: role,
            issuer: config.issuer,
          });
          matchedRole = role;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!payload || !matchedRole) {
        throw lastError || new Error('Unable to verify token');
      }

      // JTI revocation check — fail-open on Redis error
      try {
        const revoked = await redis.get(`revoked:jti:${payload.jti}`);
        if (revoked) {
          logger.warn('Authentication failed', {
            reason: 'revoked_token',
            expectedRole: matchedRole,
            tokenSub: payload.sub,
            tokenAud: payload.aud,
            tokenRole: payload.role,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
          });
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (err) {
        logger.warn('authenticate: Redis JTI check unavailable, continuing (fail-open)', {
          jti: payload.jti,
          expectedRole: matchedRole,
          error: err.message,
        });
        await publishAuthEvent(redis, {
          event: 'token_revoke_check_bypassed',
          role: matchedRole,
          userId: payload.sub,
          ip: req.ip,
          reason: 'redis_down',
          requestId: getRequestId(req),
        });
      }

      // Password-changed invalidation check — fail-open on Redis error
      try {
        const changedAt = await redis.get(`password_changed:${expectedRole}:${payload.sub}`);
        if (changedAt && Number(changedAt) > payload.iat * 1000) {
          logger.warn('Authentication failed', {
            reason: 'password_changed_after_token_issued',
            expectedRole: matchedRole,
            tokenSub: payload.sub,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
          });
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (err) {
        logger.warn('authenticate: Redis password-changed check unavailable, continuing (fail-open)', {
          userId: payload.sub,
          expectedRole: matchedRole,
          error: err.message,
        });
      }

      const user = await authRepository.findActiveUserById(matchedRole, payload.sub);
      if (!user) {
        logger.warn('Authentication failed', {
          reason: 'inactive_or_removed_account',
          expectedRole: matchedRole,
          tokenSub: payload.sub,
          path: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const passwordChangedAt = user.password_changed_at
        ? new Date(user.password_changed_at).getTime()
        : 0;
      if (passwordChangedAt && passwordChangedAt > payload.iat * 1000) {
        logger.warn('Authentication failed', {
          reason: 'password_changed_after_token_issued_db',
          expectedRole: matchedRole,
          tokenSub: payload.sub,
          path: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      req.user = payload;
      req.token = token;
      return next();
    } catch (error) {
      logger.warn('Authentication failed', {
        reason: error?.name || 'jwt_verification_error',
        message: error?.message,
        expectedRole,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

module.exports = authenticate;
