const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const routes = require('./routes');
const requestLogger = require('./middleware/requestLogger');
const corsMiddleware = require('./middleware/cors');
const requireJson = require('./middleware/requireJson');
const sanitizeBody = require('./middleware/sanitizeBody');
const { globalLimiter } = require('./middleware/rateLimiters');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const API_SECURITY_HEADERS = Object.freeze({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
  crossOriginResourcePolicy: { policy: 'same-site' },
});

function createApp() {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.set('query parser', 'simple');

  app.use(requestLogger);
  app.use(helmet(API_SECURITY_HEADERS));
  app.use(corsMiddleware);
  app.use(globalLimiter);
  app.use(requireJson);
  app.use(express.json({ limit: config.bodyLimit, strict: true }));
  app.use(cookieParser());
  app.use(sanitizeBody);

  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
