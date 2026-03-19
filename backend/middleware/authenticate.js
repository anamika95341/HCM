const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');

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
        return res.status(401).json({ error: 'Unauthorized' });
      }

      req.user = payload;
      req.token = token;
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

module.exports = authenticate;
