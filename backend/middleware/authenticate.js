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
        // WHY: Privileged roles must fail CLOSED when Redis is unavailable.
        // A manually revoked admin/masteradmin/minister/deo token must never slip through.
        // Citizens fail-open because their tokens are lower-risk and Redis outages
        // shouldn't lock out citizens from basic services.
        const PRIVILEGED_ROLES = new Set(['admin', 'masteradmin', 'minister', 'deo']);
        if (PRIVILEGED_ROLES.has(matchedRole)) {
          logger.error('authenticate: Redis unavailable for JTI check on privileged role — denying (fail-closed)', {
            jti: payload.jti,
            role: matchedRole,
            userId: payload.sub,
            error: err.message,
          });
          return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
        }
        // Citizen: fail-open (log + continue)
        logger.warn('authenticate: Redis JTI check unavailable for citizen, continuing (fail-open)', {
          jti: payload.jti,
          expectedRole: matchedRole,
          error: err.message,
        });
        // WHY: publishAuthEvent also uses Redis. If Redis is down this will fail.
        // Swallow the error — we are already in a Redis-down handler.
        await publishAuthEvent(redis, {
          event: 'token_revoke_check_bypassed',
          role: matchedRole,
          userId: payload.sub,
          ip: req.ip,
          reason: 'redis_down',
          requestId: getRequestId(req),
        }).catch(() => {});
      }

      // Password-changed invalidation check — fail-open on Redis error
      try {
        // WHY: Use matchedRole (the verified role), not expectedRole (which may be an array
        // when authenticate() is called with multiple allowed roles). Using expectedRole would
        // produce a key like "password_changed:admin,masteradmin:<sub>" that never matches.
        const changedAt = await redis.get(`password_changed:${matchedRole}:${payload.sub}`);
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
      req.authRole = matchedRole;
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
