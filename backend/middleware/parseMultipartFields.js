module.exports = function parseMultipartFields(fields = []) {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        if (typeof req.body[field] === 'string' && req.body[field].trim()) {
          req.body[field] = JSON.parse(req.body[field]);
        }
      }
      next();
    } catch (error) {
      error.status = 400;
      error.message = 'Invalid multipart JSON field';
      next(error);
    }
  };
};
