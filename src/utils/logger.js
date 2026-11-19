const winston = require('winston');
require('winston-daily-rotate-file');
const { Logtail } = require('@logtail/node');
const { LogtailTransport } = require('@logtail/winston');
const config = require('../config/env');

const ROTATION_DEFAULTS = Object.freeze({
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '14d',
});

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaText = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaText}`;
  }),
);

function rotatingFile(filePrefix, level) {
  return new winston.transports.DailyRotateFile({
    ...ROTATION_DEFAULTS,
    dirname: config.logDir,
    filename: `${filePrefix}-%DATE%.log`,
    level,
  });
}

const consoleTransport = () => new winston.transports.Console({
  format: consoleFormat,
  silent: config.nodeEnv === 'test',
});

const logtailClient = config.logtail.sourceToken
  ? new Logtail(config.logtail.sourceToken, config.logtail.endpoint ? { endpoint: config.logtail.endpoint } : {})
  : null;

// Grafana Loki на собственном сервере: включается переменной LOKI_URL.
// Метка stream разделяет журнал приложения (app) и журнал безопасности (security).
function lokiTransport(stream) {
  if (!config.loki.url || config.nodeEnv === 'test') {
    return null;
  }
  const LokiTransport = require('winston-loki');
  return new LokiTransport({
    host: config.loki.url,
    labels: { app: 'gtd-task-service', env: config.nodeEnv, stream },
    json: true,
    format: fileFormat,
    batching: true,
    interval: 5,
    replaceTimestamp: true,
    level: 'info',
    // eslint-disable-next-line no-console
    onConnectionError: (error) => console.error('loki_connection_error', error && error.message),
  });
}

function remoteTransports(stream) {
  const transports = [];
  if (logtailClient) {
    transports.push(new LogtailTransport(logtailClient, { level: 'info' }));
  }
  const loki = lokiTransport(stream);
  if (loki) {
    transports.push(loki);
  }
  return transports;
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: fileFormat,
  defaultMeta: { service: 'gtd-task-service', release: config.release },
  transports: [
    consoleTransport(),
    rotatingFile('app', 'info'),
    rotatingFile('error', 'error'),
    ...remoteTransports('app'),
  ],
});

const securityLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'gtd-task-service', release: config.release, channel: 'security' },
  transports: [consoleTransport(), rotatingFile('security', 'info'), ...remoteTransports('security')],
});

async function flushLogs() {
  if (logtailClient) {
    await logtailClient.flush();
  }
}

const isRemoteLoggingEnabled = Boolean(logtailClient) || Boolean(config.loki.url);

module.exports = { logger, securityLogger, flushLogs, isRemoteLoggingEnabled };
