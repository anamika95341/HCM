const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
const env = require('../config/env');
const authRepository = require('../modules/auth/auth.repository');
const { publishAuthEvent } = require('../utils/authStream');
const { sha256 } = require('../utils/crypto');
const logger = require('../utils/logger');

const PRIVILEGED_ROLES = new Set(['admin', 'masteradmin', 'minister', 'deo']);

function getCookieToken(req) {
  return req.cookies?.access_token || null;
}

function getRequestId(req) {
  return req.get?.('x-request-id') || req.headers['x-request-id'];
}

function authenticate(expectedRole) {
  return async (req, res, next) => {
    try {
      const token = getCookieToken(req);
      if (!token) {
        logger.warn('Authentication failed', {
          reason: 'missing_access_token_cookie',
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

      // JTI revocation check — fail-open on Redis error (fail-closed for privileged roles)
      try {
        const revoked = await redis.get(`revoked:jti:${payload.jti}`);
        if (revoked) {
          logger.warn('Authentication failed', {
            reason: 'revoked_token',
            expectedRole: matchedRole,
            tokenSub: payload.sub,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
          });
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (err) {
        if (PRIVILEGED_ROLES.has(matchedRole)) {
          logger.error('authenticate: Redis unavailable for JTI check on privileged role — denying (fail-closed)', {
            jti: payload.jti,
            role: matchedRole,
            userId: payload.sub,
            error: err.message,
          });
          return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
        }
        logger.warn('authenticate: Redis JTI check unavailable for citizen, continuing (fail-open)', {
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
        }).catch(() => {});
      }

      // Password-changed invalidation check — fail-open on Redis error
      try {
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

      // Absolute session timeout + idle timeout checks (keyed by session ID)
      if (payload.sid) {
        try {
          const [sessionMeta, lastActivity] = await Promise.all([
            redis.get(`session:meta:${payload.sid}`),
            redis.get(`lastActivity:${matchedRole}:${payload.sub}:${payload.sid}`),
          ]);

          if (!sessionMeta) {
            logger.warn('Authentication failed', {
              reason: 'session_expired_or_revoked',
              expectedRole: matchedRole,
              tokenSub: payload.sub,
              path: req.originalUrl,
              ip: req.ip,
            });
            return res.status(401).json({ error: 'Unauthorized' });
          }

          const meta = JSON.parse(sessionMeta);
          if (Date.now() >= meta.absoluteExpiry) {
            logger.warn('Authentication failed', {
              reason: 'absolute_session_timeout',
              expectedRole: matchedRole,
              tokenSub: payload.sub,
              path: req.originalUrl,
              ip: req.ip,
            });
            return res.status(401).json({ error: 'Unauthorized' });
          }

          if (meta.uaHash) {
            const requestUaHash = sha256(req.get('user-agent') || '');
            if (requestUaHash !== meta.uaHash) {
              logger.warn('authenticate: user-agent mismatch — possible session hijack', {
                sid: payload.sid,
                userId: payload.sub,
                role: matchedRole,
                path: req.originalUrl,
                ip: req.ip,
              });
            }
          }

          if (!lastActivity) {
            logger.warn('Authentication failed', {
              reason: 'idle_timeout',
              expectedRole: matchedRole,
              tokenSub: payload.sub,
              path: req.originalUrl,
              ip: req.ip,
            });
            return res.status(401).json({ error: 'Unauthorized' });
          }

          // Reset idle timer on each authenticated request
          await redis.set(
            `lastActivity:${matchedRole}:${payload.sub}:${payload.sid}`,
            String(Date.now()),
            'EX',
            env.idleTimeoutSeconds,
          );
        } catch (err) {
          if (PRIVILEGED_ROLES.has(matchedRole)) {
            logger.error('authenticate: Redis unavailable for session checks on privileged role — denying (fail-closed)', {
              sid: payload.sid,
              role: matchedRole,
              userId: payload.sub,
              error: err.message,
            });
            return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
          }
          logger.warn('authenticate: Redis session/idle check unavailable for citizen, continuing (fail-open)', {
            sid: payload.sid,
            expectedRole: matchedRole,
            error: err.message,
          });
        }
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

      // CSRF: double-submit cookie validation for state-changing requests.
      // Soft enforcement: only reject when XSRF-TOKEN cookie is present — backward-compatible rollout.
      // Axios automatically reads XSRF-TOKEN and sends X-XSRF-TOKEN when withCredentials=true.
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const cookieToken = req.cookies?.['XSRF-TOKEN'];
        if (cookieToken) {
          const headerToken = req.get('x-xsrf-token');
          if (!headerToken || cookieToken !== headerToken) {
            logger.warn('Authentication failed', {
              reason: 'csrf_validation_failed',
              expectedRole: matchedRole,
              tokenSub: payload.sub,
              path: req.originalUrl,
              method: req.method,
              ip: req.ip,
            });
            return res.status(403).json({ error: 'Forbidden' });
          }
        }
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
