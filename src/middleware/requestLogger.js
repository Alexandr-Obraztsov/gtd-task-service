const { logger } = require('../utils/logger');

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info('http', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      ip: req.ip,
    });
  });
  next();
}

module.exports = requestLogger;
