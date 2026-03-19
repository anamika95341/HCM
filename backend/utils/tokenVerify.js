const jwt = require('jsonwebtoken');
const keys = require('../config/keys');

function verifyAdminRegistrationToken(token) {
  if (!keys.adminRegistrationPublicKey) {
    throw new Error('ADMIN_RSA_PUBLIC_KEY is not configured');
  }

  return jwt.verify(token, keys.adminRegistrationPublicKey, {
    algorithms: ['RS256'],
  });
}

module.exports = { verifyAdminRegistrationToken };
