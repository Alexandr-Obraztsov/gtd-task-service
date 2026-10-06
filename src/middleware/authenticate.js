const { User } = require('../models');
const { verifyAccessToken, isTokenExpiredError } = require('../utils/tokens');
const { UnauthorizedError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspiciousRequest } = require('../utils/securityEvents');

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/;

function extractBearerToken(req) {
  const header = req.get('authorization');
  if (!header) {
    throw new UnauthorizedError('Отсутствует токен доступа', 'TOKEN_MISSING');
  }
  const match = BEARER_PATTERN.exec(header);
  if (!match) {
    reportSuspiciousRequest(SECURITY_EVENTS.INVALID_TOKEN, req, { reason: 'malformed_header' });
    throw new UnauthorizedError('Некорректный заголовок Authorization', 'TOKEN_INVALID');
  }
  return match[1];
}

function decodeAccessToken(req, token) {
  try {
    return verifyAccessToken(token);
  } catch (error) {
    if (isTokenExpiredError(error)) {
      throw new UnauthorizedError('Срок действия токена истёк', 'TOKEN_EXPIRED');
    }
    reportSuspiciousRequest(SECURITY_EVENTS.INVALID_TOKEN, req, { reason: error.message });
    throw new UnauthorizedError('Недействительный токен доступа', 'TOKEN_INVALID');
  }
}

async function authenticate(req, res, next) {
  const payload = decodeAccessToken(req, extractBearerToken(req));
  const user = await User.findByPk(Number(payload.sub));
  if (!user) {
    reportSuspiciousRequest(SECURITY_EVENTS.INVALID_TOKEN, req, { reason: 'user_not_found', sub: payload.sub });
    throw new UnauthorizedError('Пользователь не найден', 'TOKEN_INVALID');
  }
  req.actor = {
    id: user.id,
    email: user.email,
    role: user.role,
    ip: req.ip,
    request: { method: req.method, path: req.originalUrl, userAgent: req.get('user-agent') },
  };
  next();
}

module.exports = authenticate;
