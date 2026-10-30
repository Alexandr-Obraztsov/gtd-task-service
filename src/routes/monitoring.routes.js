const path = require('node:path');
const { Router } = require('express');
const helmet = require('helmet');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const roleGuard = require('../middleware/roleGuard');
const metricsAccess = require('../middleware/metricsAccess');
const { metricsLimiter } = require('../middleware/rateLimiters');
const metrics = require('../monitoring/metrics');
const { checkDatabase } = require('../monitoring/health');
const { ROLES } = require('../utils/roles');
const { logger } = require('../utils/logger');

const DASHBOARD_DIR = path.resolve(__dirname, '../public/dashboard');

// Страница дашборда — единственный HTML-ответ API, поэтому у неё своя CSP:
// только собственные файлы, без inline-скриптов, запросы — только на тот же origin.
const DASHBOARD_SECURITY_HEADERS = Object.freeze({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
});

const DASHBOARD_FILES = Object.freeze([
  { route: '/dashboard', file: 'index.html' },
  { route: '/dashboard/dashboard.js', file: 'dashboard.js' },
  { route: '/dashboard/dashboard.css', file: 'dashboard.css' },
]);

const router = Router();

router.get('/health/ready', validate(), async (req, res) => {
  const database = await checkDatabase();
  const ready = database.status === 'up';
  if (!ready) {
    logger.error('readiness_check_failed', { database });
  }
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'unavailable',
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database },
  });
});

router.get('/metrics', metricsLimiter, metricsAccess, validate(), (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json(metrics.snapshot());
});

router.use('/dashboard', helmet(DASHBOARD_SECURITY_HEADERS));
DASHBOARD_FILES.forEach(({ route, file }) => {
  router.get(route, validate(), (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(file, { root: DASHBOARD_DIR, dotfiles: 'deny' }, (error) => error && next(error));
  });
});

// Искусственная ошибка для проверки Sentry и журналов: только admin, только POST.
router.post('/debug/sentry-test', authenticate, roleGuard(ROLES.ADMIN), validate(), () => {
  throw new Error('Тестовая ошибка: проверка интеграции с Sentry (POST /debug/sentry-test)');
});

module.exports = router;
