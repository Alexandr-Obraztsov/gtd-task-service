const config = require('../config/env');
const { User } = require('../models');
const { ROLES } = require('../utils/roles');
const { hashPassword, verifyPassword } = require('../utils/password');
const { ConflictError, UnauthorizedError, LockedError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspicious } = require('../utils/securityEvents');
const { logger } = require('../utils/logger');
const { issueTokenPair, rotateRefreshToken, revokeRefreshToken } = require('./token.service');

const LOCK_DURATION_MS = config.lockout.durationMinutes * 60 * 1000;

function invalidCredentials() {
  return new UnauthorizedError('Неверный email или пароль', 'INVALID_CREDENTIALS');
}

function lockedError(user) {
  const retryAfterSeconds = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
  return new LockedError(
    `Учётная запись временно заблокирована после ${config.lockout.maxFailedAttempts} неудачных попыток входа`,
    retryAfterSeconds,
  );
}

async function registerUser({ email, password }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new ConflictError('Пользователь с таким email уже существует');
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create(
    { email, passwordHash, role: ROLES.USER },
    { fields: ['email', 'passwordHash', 'role'] },
  );
  logger.info('user_registered', { userId: user.id });
  return user;
}

async function recordFailedAttempt(user, requestContext) {
  await user.increment('failedAttempts');
  await user.reload();
  if (user.failedAttempts < config.lockout.maxFailedAttempts) {
    return;
  }
  await user.update({ failedAttempts: 0, lockUntil: new Date(Date.now() + LOCK_DURATION_MS) });
  reportSuspicious(SECURITY_EVENTS.ACCOUNT_LOCKED, {
    ...requestContext,
    userId: user.id,
    lockUntil: user.lockUntil.toISOString(),
  });
}

async function recordSuccessfulLogin(user) {
  await user.update({ failedAttempts: 0, lockUntil: null, lastLoginAt: new Date() });
}

async function loginUser({ email, password }, requestContext) {
  const user = await User.findOne({ where: { email } });

  if (user && user.isLocked()) {
    reportSuspicious(SECURITY_EVENTS.LOGIN_BLOCKED_LOCKED, { ...requestContext, userId: user.id });
    throw lockedError(user);
  }

  const passwordMatches = await verifyPassword(password, user && user.passwordHash);
  if (!user || !passwordMatches) {
    reportSuspicious(SECURITY_EVENTS.LOGIN_FAILED, { ...requestContext, email, userExists: Boolean(user) });
    if (user) {
      await recordFailedAttempt(user, requestContext);
    }
    throw invalidCredentials();
  }

  await recordSuccessfulLogin(user);
  const tokens = await issueTokenPair(user, requestContext.ip);
  logger.info('user_logged_in', { userId: user.id, ip: requestContext.ip });
  return { user, ...tokens };
}

async function refreshSession(rawToken, requestContext) {
  if (!rawToken) {
    throw new UnauthorizedError('Отсутствует refresh-токен', 'REFRESH_TOKEN_MISSING');
  }
  const { user, pair } = await rotateRefreshToken(rawToken, requestContext.ip);
  return { user, ...pair };
}

async function logoutSession(rawToken) {
  if (rawToken) {
    await revokeRefreshToken(rawToken);
  }
}

module.exports = { registerUser, loginUser, refreshSession, logoutSession };
