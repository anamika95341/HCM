const { normalizeObjectStrings } = require('../utils/normalize');

module.exports = function validateRequest(schema, target = 'body') {
  return (req, res, next) => {
    const payload = normalizeObjectStrings(req[target]);
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    req[target] = parsed.data;
    return next();
  };
};
