const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const redis = require('../config/redis');

function otpKey({ role, userId, purpose, ip, scope }) {
  return `otp:${role}:${userId}:${purpose}:${scope || ip || 'global'}`;
}

async function generateOtp({ role, userId, purpose, ip, scope }) {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hash = await bcrypt.hash(otp, 10);
  const key = otpKey({ role, userId, purpose, ip, scope });
  await redis.set(key, hash, 'EX', 300);
  return otp;
}

async function verifyOtp({ role, userId, purpose, ip, scope, otp }) {
  const key = otpKey({ role, userId, purpose, ip, scope });
  const hash = await redis.get(key);
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
