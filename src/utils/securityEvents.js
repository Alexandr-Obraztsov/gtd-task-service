const { securityLogger } = require('./logger');

const SECURITY_EVENTS = Object.freeze({
  LOGIN_FAILED: 'login_failed',
  LOGIN_BLOCKED_LOCKED: 'login_blocked_locked',
  ACCOUNT_LOCKED: 'account_locked',
  INVALID_TOKEN: 'invalid_token',
  REFRESH_TOKEN_REUSE: 'refresh_token_reuse',
  INSUFFICIENT_ROLE: 'insufficient_role',
  FOREIGN_RESOURCE_ACCESS: 'foreign_resource_access',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CORS_ORIGIN_REJECTED: 'cors_origin_rejected',
  MASS_ASSIGNMENT_ATTEMPT: 'mass_assignment_attempt',
});

function describeRequest(req) {
  return {
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
    userAgent: req.get('user-agent'),
    userId: req.actor ? req.actor.id : undefined,
  };
}

function reportSuspicious(event, context, details = {}) {
  securityLogger.warn(event, { event, ...context, ...details });
}

function reportSuspiciousRequest(event, req, details = {}) {
  reportSuspicious(event, describeRequest(req), details);
}

module.exports = { SECURITY_EVENTS, reportSuspicious, reportSuspiciousRequest };
