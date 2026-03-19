function normalizeString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  return input.normalize('NFC').trim();
}

function normalizeObjectStrings(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeObjectStrings);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeObjectStrings(entry)]));
  }
  return normalizeString(value);
}

module.exports = { normalizeString, normalizeObjectStrings };
