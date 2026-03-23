const env = require('./env');
const { getDevSecretOrEnv } = require('./devSecrets');

module.exports = {
  adminRegistrationPublicKey: getDevSecretOrEnv(env.adminRsaPublicKey, 'adminPublicKey')?.replace(/\\n/g, '\n'),
};
