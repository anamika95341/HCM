const logger = require('./logger');

async function publishAuthEvent(redis, { event, role, userId, ip, reason } = {}) {
  try {
    await redis.xadd(
      'auth:events',
      'MAXLEN', '~', '50000',
      '*',
      'event', event || '',
      'role', role || '',
      'userId', String(userId || ''),
      'ip', ip || '',
      'reason', reason || '',
      'ts', String(Date.now()),
    );
  } catch (err) {
    logger.warn('authStream: failed to publish auth event', {
      event,
      role,
      userId,
      error: err.message,
    });
  }
}

module.exports = { publishAuthEvent };
