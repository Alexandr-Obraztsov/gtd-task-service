const cors = require('cors');
const config = require('../config/env');
const { ForbiddenError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspiciousRequest } = require('../utils/securityEvents');

const allowedOrigins = new Set(config.corsOrigins);

const CORS_OPTIONS = Object.freeze({
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

function resolveCorsOptions(req, callback) {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    reportSuspiciousRequest(SECURITY_EVENTS.CORS_ORIGIN_REJECTED, req, { origin });
    callback(new ForbiddenError('Источник запроса не разрешён политикой CORS', 'CORS_REJECTED'));
    return;
  }
  callback(null, { ...CORS_OPTIONS, origin: Boolean(origin) });
}

module.exports = cors(resolveCorsOptions);
