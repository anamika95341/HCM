const env = require('./env');

module.exports = {
  adminRegistrationPublicKey: env.adminRsaPublicKey ? env.adminRsaPublicKey.replace(/\\n/g, '\n') : undefined,
};
