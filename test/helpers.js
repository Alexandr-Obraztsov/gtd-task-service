const BASE_ENV = Object.freeze({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://u:p@127.0.0.1:1/none',
  JWT_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
  CORS_ORIGINS: 'http://localhost:5173,https://gtd-client.example.app',
  LOG_LEVEL: 'error',
});

function loadFresh(modulePath, overrides = {}) {
  const keys = ['COOKIE_SAMESITE', 'DATABASE_SSL', ...Object.keys(BASE_ENV), ...Object.keys(overrides)];
  keys.forEach((key) => delete process.env[key]);
  Object.assign(process.env, BASE_ENV, overrides);
  Object.keys(require.cache)
    .filter((file) => file.includes('/src/'))
    .forEach((file) => delete require.cache[file]);
  return require(modulePath);
}

module.exports = { loadFresh };
