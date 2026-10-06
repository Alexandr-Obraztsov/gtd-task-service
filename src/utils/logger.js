const winston = require('winston');
require('winston-daily-rotate-file');
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

const logger = winston.createLogger({
  level: config.logLevel,
  format: fileFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    rotatingFile('app', 'info'),
    rotatingFile('error', 'error'),
  ],
});

const securityLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { channel: 'security' },
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    rotatingFile('security', 'info'),
  ],
});

module.exports = { logger, securityLogger };
