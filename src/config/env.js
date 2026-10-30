const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const MIN_SECRET_LENGTH = 32;

function readRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана обязательная переменная окружения ${name}`);
  }
  return value;
}

function readSecret(name) {
  const value = readRequired(name);
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} должен содержать не менее ${MIN_SECRET_LENGTH} символов`);
  }
  return value;
}

function readOptional(name) {
  const value = (process.env[name] || '').trim();
  return value || undefined;
}

function readOptionalSecret(name) {
  const value = readOptional(name);
  if (value !== undefined && value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} должен содержать не менее ${MIN_SECRET_LENGTH} символов`);
  }
  return value;
}

function readBoolean(name, fallback) {
  const raw = readOptional(name);
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function readInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} должен быть целым числом`);
  }
  return parsed;
}

function readList(name) {
  return (process.env[name] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';

const jwtSecret = readSecret('JWT_SECRET');
const jwtRefreshSecret = readSecret('JWT_REFRESH_SECRET');

if (jwtSecret === jwtRefreshSecret) {
  throw new Error('JWT_SECRET и JWT_REFRESH_SECRET должны различаться');
}

const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: readInteger('PORT', 3000),
  trustProxy: readInteger('TRUST_PROXY', 0),
  databaseUrl: readRequired('DATABASE_URL'),
  databaseSsl: readBoolean('DATABASE_SSL', false),
  corsOrigins: readList('CORS_ORIGINS'),
  bodyLimit: process.env.BODY_LIMIT || '10kb',
  logDir: path.resolve(__dirname, '../..', process.env.LOG_DIR || 'logs'),
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  release: readOptional('RELEASE') || readOptional('RENDER_GIT_COMMIT') || 'local',
  logtail: Object.freeze({
    sourceToken: readOptional('LOGTAIL_SOURCE_TOKEN'),
    endpoint: readOptional('LOGTAIL_ENDPOINT'),
  }),
  sentry: Object.freeze({
    dsn: readOptional('SENTRY_DSN'),
    environment: readOptional('SENTRY_ENVIRONMENT') || nodeEnv,
  }),
  metricsToken: readOptionalSecret('METRICS_TOKEN'),
  jwt: Object.freeze({
    accessSecret: jwtSecret,
    refreshSecret: jwtRefreshSecret,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: readInteger('JWT_REFRESH_TTL_DAYS', 7),
    issuer: 'gtd-task-service',
    audience: 'gtd-task-service-clients',
  }),
  bcryptRounds: readInteger('BCRYPT_ROUNDS', 12),
  lockout: Object.freeze({
    maxFailedAttempts: readInteger('LOCKOUT_MAX_ATTEMPTS', 5),
    durationMinutes: readInteger('LOCKOUT_DURATION_MINUTES', 15),
  }),
  rateLimit: Object.freeze({
    windowMinutes: readInteger('RATE_LIMIT_WINDOW_MINUTES', 15),
    globalMax: readInteger('RATE_LIMIT_MAX', 300),
    authMax: readInteger('AUTH_RATE_LIMIT_MAX', 20),
  }),
});

module.exports = config;
