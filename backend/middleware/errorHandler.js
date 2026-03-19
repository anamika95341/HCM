const logger = require('../utils/logger');

module.exports = function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error', {
    error: err,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  const status = err.statusCode || err.status || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong'
    : err.message || 'Something went wrong';

  res.status(status).json({ error: message });
};
