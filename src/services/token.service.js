const { sequelize, RefreshToken, User } = require('../models');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshTokenExpiryDate,
} = require('../utils/tokens');
const { UnauthorizedError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspicious } = require('../utils/securityEvents');

function invalidRefreshToken() {
  return new UnauthorizedError('Недействительный refresh-токен', 'REFRESH_TOKEN_INVALID');
}

function decodeRefreshToken(rawToken) {
  try {
    return verifyRefreshToken(rawToken);
  } catch {
    throw invalidRefreshToken();
  }
}

async function storeRefreshToken(userId, rawToken, ip, transaction) {
  await RefreshToken.create(
    { userId, tokenHash: hashToken(rawToken), expiresAt: refreshTokenExpiryDate(), createdByIp: ip },
    { transaction },
  );
}

async function issueTokenPair(user, ip, transaction) {
  const refreshToken = signRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken, ip, transaction);
  return { accessToken: signAccessToken(user), refreshToken };
}

function revokeAllForUser(userId, transaction) {
  return RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null }, transaction },
  );
}

async function handleReuse(storedToken, ip) {
  await revokeAllForUser(storedToken.userId);
  reportSuspicious(SECURITY_EVENTS.REFRESH_TOKEN_REUSE, { userId: storedToken.userId, ip });
}

async function rotateRefreshToken(rawToken, ip) {
  const payload = decodeRefreshToken(rawToken);
  const tokenHash = hashToken(rawToken);

  const outcome = await sequelize.transaction(async (transaction) => {
    const storedToken = await RefreshToken.findOne({
      where: { tokenHash },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!storedToken || String(storedToken.userId) !== payload.sub) {
      return { error: invalidRefreshToken() };
    }
    if (!storedToken.isActive()) {
      return { reusedToken: storedToken };
    }
    const user = await User.findByPk(storedToken.userId, { transaction });
    if (!user) {
      return { error: invalidRefreshToken() };
    }
    const pair = await issueTokenPair(user, ip, transaction);
    await storedToken.update(
      { revokedAt: new Date(), replacedByHash: hashToken(pair.refreshToken) },
      { transaction },
    );
    return { user, pair };
  });

  if (outcome.reusedToken) {
    await handleReuse(outcome.reusedToken, ip);
    throw invalidRefreshToken();
  }
  if (outcome.error) {
    throw outcome.error;
  }
  return outcome;
}

async function revokeRefreshToken(rawToken) {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { tokenHash: hashToken(rawToken), revokedAt: null } },
  );
}

module.exports = { issueTokenPair, rotateRefreshToken, revokeRefreshToken };
