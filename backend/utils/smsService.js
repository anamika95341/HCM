const logger = require('./logger');

async function sendSms({ to, message }) {
  logger.info('SMS dispatch requested', {
    to: to ? `******${String(to).slice(-4)}` : undefined,
    provider: process.env.SMS_PROVIDER || 'mock',
    messageLength: message?.length || 0,
  });
}

module.exports = { sendSms };
