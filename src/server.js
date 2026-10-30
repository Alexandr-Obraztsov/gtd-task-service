const { initSentry, captureException, flushSentry } = require('./utils/sentry');

initSentry();

const config = require('./config/env');
const createApp = require('./app');
const { sequelize, syncDatabase } = require('./models');
const { logger, flushLogs, isRemoteLoggingEnabled } = require('./utils/logger');

const SHUTDOWN_SIGNALS = Object.freeze(['SIGINT', 'SIGTERM']);

async function connectDatabase() {
  await syncDatabase();
  logger.info('database_connected');
}

async function flushTelemetry() {
  await Promise.allSettled([flushSentry(), flushLogs()]);
}

function registerShutdown(server) {
  const shutdown = (signal) => {
    logger.info('shutdown_started', { signal });
    server.close(async () => {
      await sequelize.close();
      await flushTelemetry();
      process.exit(0);
    });
  };
  SHUTDOWN_SIGNALS.forEach((signal) => process.once(signal, () => shutdown(signal)));
}

// Необработанное исключение оставляет процесс в неопределённом состоянии:
// фиксируем его в журнале и Sentry, отправляем накопленное и завершаем процесс,
// а платформа (Render) перезапускает контейнер.
function registerCrashHandlers() {
  process.on('uncaughtException', async (error) => {
    logger.error('uncaught_exception', { message: error.message, stack: error.stack });
    captureException(error);
    await flushTelemetry();
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('unhandled_rejection', { message: error.message, stack: error.stack });
    captureException(error);
  });
}

async function start() {
  registerCrashHandlers();
  await connectDatabase();
  const server = createApp().listen(config.port, () => {
    logger.info('server_started', {
      port: config.port,
      env: config.nodeEnv,
      release: config.release,
      sentry: Boolean(config.sentry.dsn),
      remoteLogs: isRemoteLoggingEnabled,
      metrics: Boolean(config.metricsToken),
    });
  });
  registerShutdown(server);
}

start().catch(async (error) => {
  logger.error('server_start_failed', { message: error.message, stack: error.stack });
  captureException(error);
  await flushTelemetry();
  process.exit(1);
});
