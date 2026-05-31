const crypto = require('crypto');

function generateCaseCode(prefix) {
  const yy = String(new Date().getFullYear()).slice(-2);
  const random = String(crypto.randomInt(10000, 99999));
  return `${prefix}-${yy}-${random}`;
}

module.exports = { generateCaseCode };
