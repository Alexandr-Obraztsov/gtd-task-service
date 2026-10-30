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

function remoteTransports() {
  return logtailClient ? [new LogtailTransport(logtailClient, { level: 'info' })] : [];
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: fileFormat,
  defaultMeta: { service: 'gtd-task-service', release: config.release },
  transports: [
    consoleTransport(),
    rotatingFile('app', 'info'),
    rotatingFile('error', 'error'),
    ...remoteTransports(),
  ],
});

const securityLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'gtd-task-service', release: config.release, channel: 'security' },
  transports: [consoleTransport(), rotatingFile('security', 'info'), ...remoteTransports()],
});

async function flushLogs() {
  if (logtailClient) {
    await logtailClient.flush();
  }
}

module.exports = { logger, securityLogger, flushLogs, isRemoteLoggingEnabled: Boolean(logtailClient) };
