// Тестовое окружение: значения ниже — только для тестов, к реальным сервисам отношения не имеют.
// DATABASE_URL берётся из окружения (в CI — service container postgres) или из .env.
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-fedcba9876543210fedcba9876543210';
process.env.METRICS_TOKEN = 'test-metrics-token-0123456789abcdef0123456789abcdef';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOG_DIR = path.join(os.tmpdir(), 'gtd-task-service-test-logs');
process.env.LOG_LEVEL = 'error';
process.env.TRUST_PROXY = '0';
process.env.RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_MAX = '50';
process.env.SENTRY_DSN = '';
process.env.LOGTAIL_SOURCE_TOKEN = '';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
