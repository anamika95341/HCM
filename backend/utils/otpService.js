const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const createHttpError = require('http-errors');
const redis = require('../config/redis');
const logger = require('./logger');

function otpKey({ role, userId, purpose, ip, scope }) {
  return `otp:${role}:${userId}:${purpose}:${scope || ip || 'global'}`;
}

async function generateOtp({ role, userId, purpose, ip, scope }) {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hash = await bcrypt.hash(otp, 10);
  const key = otpKey({ role, userId, purpose, ip, scope });
  try {
    await redis.set(key, hash, 'EX', 300);
  } catch (err) {
    logger.warn('otpService: Redis unavailable on set', { role, userId, purpose, error: err });
    throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly');
  }
  return otp;
}

async function verifyOtp({ role, userId, purpose, ip, scope, otp }) {
  const key = otpKey({ role, userId, purpose, ip, scope });
  let hash;
  try {
    hash = await redis.get(key);
  } catch (err) {
    logger.warn('otpService: Redis unavailable on get', { role, userId, purpose, error: err });
    throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly');
  }
  if (!hash) {
    return false;
  }
  const valid = await bcrypt.compare(otp, hash);
  if (valid) {
    await redis.del(key);
  }
  return valid;
}

module.exports = { generateOtp, verifyOtp };
