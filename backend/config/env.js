const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { getDevSecretOrEnv } = require('./devSecrets');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const requiredInProduction = [
  'DATABASE_URL',
  'REDIS_URL',
  'AADHAAR_ENC_KEY',
];

if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  redisUrl: process.env.REDIS_URL,
  frontendOrigins: (process.env.FRONTEND_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean),
  jwtIssuer: process.env.JWT_ISSUER || 'citizen-portal',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  aadhaarEncryptionKey: getDevSecretOrEnv(process.env.AADHAAR_ENC_KEY, 'aadhaarEncryptionKey'),
  recaptchaSecret: process.env.RECAPTCHA_SECRET,
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_WHATSAPP_FROM,
    provider: process.env.SMS_PROVIDER || 'mock',
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  privateFileBaseUrl: process.env.PRIVATE_FILE_BASE_URL || '',
  redisMetricsTtlSeconds: Number(process.env.REDIS_METRICS_TTL_SECONDS || 300),
  alertEmailTo: process.env.ALERT_EMAIL_TO,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  clamavEnabled: process.env.CLAMAV_ENABLED === 'true',
  adminManualUnlockEmail: process.env.ADMIN_MANUAL_UNLOCK_EMAIL || '',
};
