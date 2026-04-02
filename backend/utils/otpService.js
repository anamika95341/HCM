const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const createHttpError = require('http-errors');
const redis = require('../config/redis');
const pool = require('../config/database');
const logger = require('./logger');

function otpKey({ role, userId, purpose, ip, scope }) {
  return `otp:${role}:${userId}:${purpose}:${scope || ip || 'global'}`;
}

function otpScopeKey({ ip, scope }) {
  return String(scope || ip || 'global');
}

async function storeOtpInDatabase({ role, userId, purpose, scopeKey, hash }) {
  await pool.query(
    `INSERT INTO otp_records (user_role, user_id, purpose, scope_key, otp_hash, expires_at, consumed_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '5 minutes', NULL, NOW())
     ON CONFLICT (user_role, user_id, purpose, scope_key)
     DO UPDATE SET otp_hash = EXCLUDED.otp_hash,
                   expires_at = EXCLUDED.expires_at,
                   consumed_at = NULL,
                   updated_at = NOW()`,
    [role, userId, purpose, scopeKey, hash]
  );
}

async function loadOtpFromDatabase({ role, userId, purpose, scopeKey }) {
  const result = await pool.query(
    `SELECT id, otp_hash, expires_at, consumed_at
       FROM otp_records
      WHERE user_role = $1
        AND user_id = $2
        AND purpose = $3
        AND scope_key = $4`,
    [role, userId, purpose, scopeKey]
  );
  return result.rows[0] || null;
}

async function consumeOtpInDatabase(id) {
  await pool.query(
    `UPDATE otp_records
        SET consumed_at = NOW(), updated_at = NOW()
      WHERE id = $1`,
    [id]
  );
}

async function generateOtp({ role, userId, purpose, ip, scope }) {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hash = await bcrypt.hash(otp, 10);
  const key = otpKey({ role, userId, purpose, ip, scope });
  const scopeKey = otpScopeKey({ ip, scope });
  try {
    await redis.set(key, hash, 'EX', 300);
  } catch (err) {
    logger.warn('otpService: Redis unavailable on set, using database fallback', { role, userId, purpose, scopeKey, error: err });
    try {
      await storeOtpInDatabase({ role, userId, purpose, scopeKey, hash });
    } catch (dbError) {
      logger.error('otpService: database fallback failed on set', { role, userId, purpose, scopeKey, error: dbError });
      throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly');
    }
  }
  return otp;
}

async function verifyOtp({ role, userId, purpose, ip, scope, otp }) {
  const key = otpKey({ role, userId, purpose, ip, scope });
  const scopeKey = otpScopeKey({ ip, scope });
  let hash;
  try {
    hash = await redis.get(key);
  } catch (err) {
    logger.warn('otpService: Redis unavailable on get, using database fallback', { role, userId, purpose, scopeKey, error: err });
    let dbRecord;
    try {
      dbRecord = await loadOtpFromDatabase({ role, userId, purpose, scopeKey });
    } catch (dbError) {
      logger.error('otpService: database fallback failed on get', { role, userId, purpose, scopeKey, error: dbError });
      throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly');
    }
    if (!dbRecord || dbRecord.consumed_at || new Date(dbRecord.expires_at).getTime() < Date.now()) {
      return false;
    }
    const validDbOtp = await bcrypt.compare(otp, dbRecord.otp_hash);
    if (validDbOtp) {
      await consumeOtpInDatabase(dbRecord.id);
    }
    return validDbOtp;
  }
  if (!hash) {
    return false;
  }
  const valid = await bcrypt.compare(otp, hash);
  if (valid) {
    try {
      await redis.del(key);
    } catch (err) {
      logger.warn('otpService: Redis unavailable on delete after successful verification', { role, userId, purpose, scopeKey, error: err });
    }
  }
  return valid;
}

module.exports = { generateOtp, verifyOtp };
