const env = require('./env');

function normalizeKey(key) {
  return key ? key.replace(/\\n/g, '\n') : undefined;
}

function getRoleConfig(role) {
  const upper = role.toUpperCase();
  return {
    privateKey: normalizeKey(process.env[`JWT_${upper}_PRIVATE_KEY`]) || normalizeKey(process.env.JWT_PRIVATE_KEY),
    publicKey: normalizeKey(process.env[`JWT_${upper}_PUBLIC_KEY`]) || normalizeKey(process.env.JWT_PUBLIC_KEY),
    issuer: env.jwtIssuer,
    audience: role,
    accessTokenTtl: env.accessTokenTtl,
    refreshTokenTtlDays: env.refreshTokenTtlDays,
  };
}

module.exports = { getRoleConfig };
