const authenticate = require('./authenticate');

module.exports = function authenticateAny(...roles) {
  return authenticate(roles.flat());
};
