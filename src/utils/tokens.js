const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const SIGNING_ALGORITHM = 'HS256';
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const TOKEN_TYPES = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
});

const commonClaims = Object.freeze({
  algorithm: SIGNING_ALGORITHM,
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
});

function signAccessToken(user) {
  return jwt.sign({ role: user.role, type: TOKEN_TYPES.ACCESS }, config.jwt.accessSecret, {
    ...commonClaims,
    subject: String(user.id),
    expiresIn: config.jwt.accessTtl,
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ type: TOKEN_TYPES.REFRESH }, config.jwt.refreshSecret, {
    ...commonClaims,
    subject: String(userId),
    jwtid: crypto.randomUUID(),
    expiresIn: `${config.jwt.refreshTtlDays}d`,
  });
}

function verifyToken(token, secret, expectedType) {
  const payload = jwt.verify(token, secret, {
    algorithms: [SIGNING_ALGORITHM],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
  if (payload.type !== expectedType) {
    throw new jwt.JsonWebTokenError('unexpected token type');
  }
  return payload;
}

function verifyAccessToken(token) {
  return verifyToken(token, config.jwt.accessSecret, TOKEN_TYPES.ACCESS);
}

function verifyRefreshToken(token) {
  return verifyToken(token, config.jwt.refreshSecret, TOKEN_TYPES.REFRESH);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiryDate() {
  return new Date(Date.now() + config.jwt.refreshTtlDays * MS_IN_DAY);
}

function isTokenExpiredError(error) {
  return error instanceof jwt.TokenExpiredError;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  refreshTokenExpiryDate,
  isTokenExpiredError,
};
