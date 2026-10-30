const Sentry = require('@sentry/node');
const config = require('../config/env');

const SENSITIVE_HEADERS = Object.freeze(['authorization', 'cookie', 'set-cookie', 'x-api-key']);
const FLUSH_TIMEOUT_MS = 2000;

let enabled = false;

function scrubEvent(event) {
  if (event.request) {
    const { headers } = event.request;
    if (headers) {
      for (const name of Object.keys(headers)) {
        if (SENSITIVE_HEADERS.includes(name.toLowerCase())) {
          delete headers[name];
        }
      }
    }
    delete event.request.cookies;
    delete event.request.data;
  }
  if (event.user) {
    event.user = { id: event.user.id };
  }
  return event;
}

function initSentry() {
  if (enabled || !config.sentry.dsn) {
    return enabled;
  }
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    release: config.release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
  enabled = true;
  return enabled;
}

function isSentryEnabled() {
  return enabled;
}

// Привязывает id пользователя (без email) к текущему запросу: SDK создаёт
// изолированную область на каждый HTTP-запрос, поэтому данные не смешиваются.
function setSentryUser(userId) {
  if (enabled) {
    Sentry.getIsolationScope().setUser({ id: String(userId) });
  }
}

function captureException(error, context = {}) {
  if (!enabled) {
    return undefined;
  }
  return Sentry.withScope((scope) => {
    const { user, ...extra } = context;
    if (user) {
      scope.setUser({ id: String(user) });
    }
    scope.setContext('http_request', extra);
    return Sentry.captureException(error);
  });
}

function flushSentry() {
  return enabled ? Sentry.flush(FLUSH_TIMEOUT_MS) : Promise.resolve(true);
}

module.exports = { initSentry, isSentryEnabled, setSentryUser, captureException, flushSentry, scrubEvent };
