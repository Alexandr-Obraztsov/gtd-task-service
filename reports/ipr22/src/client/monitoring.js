import * as Sentry from '@sentry/react';

// Сбор ошибок браузера в GlitchTip (протокол Sentry). Без VITE_SENTRY_DSN
// интеграция выключена: локальная разработка и сборка от сервиса не зависят.
const DSN = import.meta.env.VITE_SENTRY_DSN;

export const isErrorTrackingEnabled = Boolean(DSN);

if (isErrorTrackingEnabled) {
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // Токены и тела запросов в отчёт не попадают.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        delete breadcrumb.data?.request_body;
        delete breadcrumb.data?.response_body;
      }
      return breadcrumb;
    },
  });
}

export const ErrorBoundary = Sentry.ErrorBoundary;
