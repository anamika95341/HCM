const sanitizeHtml = require('sanitize-html');

function sanitizeText(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

module.exports = { sanitizeText };
