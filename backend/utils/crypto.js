const crypto = require('crypto');
const env = require('../config/env');

function getAadhaarKey() {
  if (!env.aadhaarEncryptionKey) {
    throw new Error('AADHAAR_ENC_KEY is required');
  }

  const key = Buffer.from(env.aadhaarEncryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('AADHAAR_ENC_KEY must be a 64-char hex string');
  }
  return key;
}

function encryptAadhaar(aadhaar) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getAadhaarKey(), iv);
  const encrypted = Buffer.concat([cipher.update(aadhaar, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

function decryptAadhaar(payload) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getAadhaarKey(),
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

module.exports = { encryptAadhaar, decryptAadhaar, sha256 };
