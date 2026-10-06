const { UnsupportedMediaTypeError } = require('../utils/errors');

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function hasBody(req) {
  return req.get('transfer-encoding') !== undefined || Number(req.get('content-length')) > 0;
}

function requireJson(req, res, next) {
  if (BODY_METHODS.has(req.method) && hasBody(req) && !req.is('application/json')) {
    throw new UnsupportedMediaTypeError();
  }
  next();
}

module.exports = requireJson;
