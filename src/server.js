const config = require('./config/env');
const createApp = require('./app');
const { sequelize, syncDatabase } = require('./models');
const { logger } = require('./utils/logger');

const SHUTDOWN_SIGNALS = Object.freeze(['SIGINT', 'SIGTERM']);

async function connectDatabase() {
  await syncDatabase();
  logger.info('database_connected');
}

function registerShutdown(server) {
  const shutdown = (signal) => {
    logger.info('shutdown_started', { signal });
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  };
  SHUTDOWN_SIGNALS.forEach((signal) => process.once(signal, () => shutdown(signal)));
}

async function start() {
  await connectDatabase();
  const server = createApp().listen(config.port, () => {
    logger.info('server_started', { port: config.port, env: config.nodeEnv });
  });
  registerShutdown(server);
}

start().catch((error) => {
  logger.error('server_start_failed', { message: error.message, stack: error.stack });
  process.exit(1);
});
