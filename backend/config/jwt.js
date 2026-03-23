const env = require('./env');
const { getDevSecretOrEnv } = require('./devSecrets');

function normalizeKey(key) {
  return key ? key.replace(/\\n/g, '\n') : undefined;
}

function getRoleConfig(role) {
  const upper = role.toUpperCase();
  return {
    privateKey: normalizeKey(
      getDevSecretOrEnv(
        process.env[`JWT_${upper}_PRIVATE_KEY`] || process.env.JWT_PRIVATE_KEY,
        'jwtPrivateKey'
      )
    ),
    publicKey: normalizeKey(
      getDevSecretOrEnv(
        process.env[`JWT_${upper}_PUBLIC_KEY`] || process.env.JWT_PUBLIC_KEY,
        'jwtPublicKey'
      )
    ),
    issuer: env.jwtIssuer,
    audience: role,
    accessTokenTtl: env.accessTokenTtl,
    refreshTokenTtlDays: env.refreshTokenTtlDays,
  };
}

module.exports = { getRoleConfig };
