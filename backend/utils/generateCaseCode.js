const crypto = require('crypto');

function generateCaseCode(prefix) {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(100000, 999999);
  return `${prefix}-${year}-${random}`;
}

module.exports = { generateCaseCode };
