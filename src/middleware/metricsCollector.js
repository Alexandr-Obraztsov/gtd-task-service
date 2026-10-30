const metrics = require('../monitoring/metrics');

const UNCOUNTED_PREFIXES = Object.freeze(['/metrics', '/dashboard']);

function isUncounted(path) {
  return UNCOUNTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function metricsCollector(req, res, next) {
  if (isUncounted(req.path)) {
    next();
    return;
  }
  const startedAt = process.hrtime.bigint();
  metrics.requestStarted();
  let finished = false;
  const complete = () => {
    if (finished) {
      return;
    }
    finished = true;
    metrics.requestFinished(res.statusCode, Number(process.hrtime.bigint() - startedAt) / 1e6);
  };
  res.on('finish', complete);
  res.on('close', complete);
  next();
}

module.exports = metricsCollector;
