const authService = require('../services/auth.service');
const { findUserOrFail } = require('../services/user.service');
const { setRefreshCookie, clearRefreshCookie, readRefreshCookie } = require('../utils/refreshCookie');

function requestContextOf(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

function sendSession(res, { user, accessToken, refreshToken }) {
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ user, accessToken, tokenType: 'Bearer' });
}

async function register(req, res) {
  const user = await authService.registerUser(req.validated.body);
  res.status(201).json({ user });
}

async function login(req, res) {
  const session = await authService.loginUser(req.validated.body, requestContextOf(req));
  sendSession(res, session);
}

async function refresh(req, res) {
  try {
    const session = await authService.refreshSession(readRefreshCookie(req), requestContextOf(req));
    sendSession(res, session);
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
}

async function logout(req, res) {
  await authService.logoutSession(readRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(204).send();
}

async function me(req, res) {
  const user = await findUserOrFail(req.actor.id);
  res.status(200).json({ user });
}

module.exports = { register, login, refresh, logout, me };
