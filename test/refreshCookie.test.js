const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadFresh } = require('./helpers');

const COOKIE_MODULE = path.resolve(__dirname, '../src/utils/refreshCookie.js');

function captureCookie(overrides) {
  const { setRefreshCookie } = loadFresh(COOKIE_MODULE, overrides);
  let captured;
  setRefreshCookie({ cookie: (name, value, options) => { captured = { name, value, options }; } }, 'token');
  return captured.options;
}

test('по умолчанию cookie SameSite=Strict, Secure выключен вне production', () => {
  const options = captureCookie({});
  assert.equal(options.sameSite, 'strict');
  assert.equal(options.secure, false);
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, '/auth');
});

test('production: Secure включён автоматически', () => {
  const options = captureCookie({ NODE_ENV: 'production' });
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'strict');
});

test('COOKIE_SAMESITE=none (разные домены): SameSite=None и обязательно Secure', () => {
  const options = captureCookie({ NODE_ENV: 'production', COOKIE_SAMESITE: 'none' });
  assert.equal(options.sameSite, 'none');
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
});

test('COOKIE_SAMESITE=none вне production всё равно ставит Secure', () => {
  const options = captureCookie({ COOKIE_SAMESITE: 'none' });
  assert.equal(options.secure, true);
});

test('недопустимое значение COOKIE_SAMESITE отвергается при старте', () => {
  assert.throws(() => captureCookie({ COOKIE_SAMESITE: 'whatever' }), /COOKIE_SAMESITE/);
});
