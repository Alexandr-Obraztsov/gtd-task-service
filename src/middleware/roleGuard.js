const { hasRole } = require('../utils/roles');
const { ForbiddenError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspiciousRequest } = require('../utils/securityEvents');

function roleGuard(requiredRole) {
  return (req, res, next) => {
    if (!hasRole(req.actor.role, requiredRole)) {
      reportSuspiciousRequest(SECURITY_EVENTS.INSUFFICIENT_ROLE, req, {
        role: req.actor.role,
        requiredRole,
      });
      throw new ForbiddenError(`Операция доступна только для роли ${requiredRole} и выше`, 'INSUFFICIENT_ROLE');
    }
    next();
  };
}

module.exports = roleGuard;
