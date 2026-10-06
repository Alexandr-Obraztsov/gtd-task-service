const { rateLimit } = require('express-rate-limit');
const config = require('../config/env');
const { TooManyRequestsError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspiciousRequest } = require('../utils/securityEvents');

const windowMs = config.rateLimit.windowMinutes * 60 * 1000;

function createLimiter({ name, limit, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) => {
      reportSuspiciousRequest(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, req, { limiter: name, limit });
      next(new TooManyRequestsError());
    },
  });
}

const globalLimiter = createLimiter({ name: 'global', limit: config.rateLimit.globalMax });

const authLimiter = createLimiter({
  name: 'auth',
  limit: config.rateLimit.authMax,
  skipSuccessfulRequests: true,
});

module.exports = { globalLimiter, authLimiter };
