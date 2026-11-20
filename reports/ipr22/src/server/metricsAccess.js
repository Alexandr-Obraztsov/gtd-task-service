const crypto = require('node:crypto');
const config = require('../config/env');
const authenticate = require('./authenticate');
const roleGuard = require('./roleGuard');
const { ROLES } = require('../utils/roles');
const { UnauthorizedError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspiciousRequest } = require('../utils/securityEvents');

const BEARER_PATTERN = /^Bearer (\S{1,2048})$/;
const JWT_SHAPE = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;

const requireAdmin = roleGuard(ROLES.ADMIN);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest();
}

// Сравнение хешей фиксированной длины: время не зависит от длины и содержимого токена.
function isMetricsToken(candidate) {
  if (!config.metricsToken) {
    return false;
  }
  return crypto.timingSafeEqual(sha256(candidate), sha256(config.metricsToken));
}

async function authenticateAdmin(req, res, next) {
  await authenticate(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    try {
      requireAdmin(req, res, next);
    } catch (guardError) {
      next(guardError);
    }
  });
}

/**
 * Доступ к метрикам: либо статический METRICS_TOKEN (для внешних сборщиков и
 * дашборда), либо access-токен пользователя с ролью admin. Остальным — 401/403.
 */
async function metricsAccess(req, res, next) {
  const match = BEARER_PATTERN.exec(req.get('authorization') || '');
  if (!match) {
    throw new UnauthorizedError('Требуется METRICS_TOKEN или токен администратора', 'TOKEN_MISSING');
  }
  const token = match[1];
  if (isMetricsToken(token)) {
    next();
    return;
  }
  if (JWT_SHAPE.test(token)) {
    await authenticateAdmin(req, res, next);
    return;
  }
  reportSuspiciousRequest(SECURITY_EVENTS.INVALID_TOKEN, req, { reason: 'metrics_token_mismatch' });
  throw new UnauthorizedError('Недействительный токен доступа к метрикам', 'TOKEN_INVALID');
}

module.exports = metricsAccess;
