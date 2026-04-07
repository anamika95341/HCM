const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let cachedSecrets;
const cachePath = path.join(process.cwd(), '.dev-secrets.json');

function isPlaceholder(value) {
  return !value || String(value).startsWith('PASTE_');
}

function getDevSecrets() {
  if (!cachedSecrets) {
    if (fs.existsSync(cachePath)) {
      cachedSecrets = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } else {
      const jwtKeyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const adminKeyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      cachedSecrets = {
        jwtPrivateKey: jwtKeyPair.privateKey.export({ type: 'pkcs1', format: 'pem' }),
        jwtPublicKey: jwtKeyPair.publicKey.export({ type: 'pkcs1', format: 'pem' }),
        adminPrivateKey: adminKeyPair.privateKey.export({ type: 'pkcs1', format: 'pem' }),
        adminPublicKey: adminKeyPair.publicKey.export({ type: 'pkcs1', format: 'pem' }),
        aadhaarEncryptionKey: crypto.randomBytes(32).toString('hex'),
      };
      fs.writeFileSync(cachePath, JSON.stringify(cachedSecrets, null, 2));
    }
  }
  return cachedSecrets;
}

function getDevSecretOrEnv(value, fallbackKey) {
  if (!isPlaceholder(value)) {
    return value;
  }
  if (process.env.NODE_ENV === 'production') {
    return value;
  }
  return getDevSecrets()[fallbackKey];
}

module.exports = {
  getDevSecrets,
  getDevSecretOrEnv,
  isPlaceholder,
};
