const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
const logger = require('../utils/logger');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
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

      const config = getRoleConfig(expectedRole);
      const payload = jwt.verify(token, config.publicKey, {
        algorithms: ['RS256'],
        audience: expectedRole,
        issuer: config.issuer,
      });

      const revoked = await redis.get(`revoked:jti:${payload.jti}`);
      if (revoked) {
        logger.warn('Authentication failed', {
          reason: 'revoked_token',
          expectedRole,
          tokenSub: payload.sub,
          tokenAud: payload.aud,
          tokenRole: payload.role,
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
