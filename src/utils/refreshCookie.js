const config = require('../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = Object.freeze({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict',
  path: '/auth',
});

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
}

function readRefreshCookie(req) {
  return req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : undefined;
}

module.exports = { setRefreshCookie, clearRefreshCookie, readRefreshCookie };
