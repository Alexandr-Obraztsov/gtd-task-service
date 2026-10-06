const { sanitizeValue } = require('../utils/sanitize');

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

module.exports = sanitizeBody;
