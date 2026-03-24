const winston = require('winston');

const REDACT_KEYS = new Set([
  'password',
  'confirmPassword',
  'aadhaar',
  'aadhaarNumber',
  'otp',
  'token',
  'authorization',
  'refreshToken',
  'accessToken',
]);

function redact(value, key) {
  if (value == null) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      code: value.code,
      status: value.status,
      statusCode: value.statusCode,
    };
  }

  if (typeof key === 'string' && REDACT_KEYS.has(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string' && /^\d{12}$/.test(value)) {
    return `XXXX-XXXX-${value.slice(-4)}`;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)])
    );
  }

  return value;
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return JSON.stringify({
        level,
        message,
        timestamp,
        ...redact(meta),
      });
    })
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
