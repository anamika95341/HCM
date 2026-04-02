const { normalizeObjectStrings } = require('../utils/normalize');
const logger = require('../utils/logger');

module.exports = function validateRequest(schema, target = 'body') {
  return (req, res, next) => {
    const payload = normalizeObjectStrings(req[target]);
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      logger.warn('Request validation failed', {
        path: req.originalUrl,
        method: req.method,
        target,
        validationErrors: parsed.error.flatten(),
        userId: req.user?.sub || null,
        role: req.user?.role || null,
        ip: req.ip,
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    req[target] = parsed.data;
    return next();
  };
};
