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
  databaseSslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
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
  storageMode: process.env.STORAGE_MODE || 'aws',
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.AWS_REGION || 'us-east-1',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3PublicEndpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || '',
  s3AccessKeyId: process.env.STORAGE_MODE === 'local'
    ? (process.env.MINIO_ROOT_USER || process.env.AWS_ACCESS_KEY_ID || '')
    : (process.env.AWS_ACCESS_KEY_ID || ''),
  s3SecretAccessKey: process.env.STORAGE_MODE === 'local'
    ? (process.env.MINIO_ROOT_PASSWORD || process.env.AWS_SECRET_ACCESS_KEY || '')
    : (process.env.AWS_SECRET_ACCESS_KEY || ''),
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || process.env.STORAGE_MODE === 'local',
  s3SignedUrlExpirySeconds: Number(process.env.S3_SIGNED_URL_EXPIRY_SECONDS || 90),
  redisMetricsTtlSeconds: Number(process.env.REDIS_METRICS_TTL_SECONDS || 300),
  alertEmailTo: process.env.ALERT_EMAIL_TO,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  clamavEnabled: process.env.CLAMAV_ENABLED === 'true',
  adminManualUnlockEmail: process.env.ADMIN_MANUAL_UNLOCK_EMAIL || '',
  authStreamBatchSize: Number(process.env.AUTH_STREAM_BATCH_SIZE || 25),
  authStreamBlockMs: Number(process.env.AUTH_STREAM_BLOCK_MS || 5000),
  authStreamPollIntervalMs: Number(process.env.AUTH_STREAM_POLL_INTERVAL_MS || 250),
  authStreamConcurrency: Number(process.env.AUTH_STREAM_CONCURRENCY || 5),
  authStreamMaxRetries: Number(process.env.AUTH_STREAM_MAX_RETRIES || 5),
  authStreamClaimIdleMs: Number(process.env.AUTH_STREAM_CLAIM_IDLE_MS || 60000),
  authStreamReplayBatchSize: Number(process.env.AUTH_STREAM_REPLAY_BATCH_SIZE || 100),
  idleTimeoutSeconds: Number(process.env.IDLE_TIMEOUT_SECONDS || 1800),
  maxSessionSeconds: Number(process.env.MAX_SESSION_SECONDS || 28800),
};
