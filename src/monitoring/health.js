const { sequelize } = require('../models');

const DB_CHECK_TIMEOUT_MS = 3000;

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function checkDatabase() {
  const startedAt = process.hrtime.bigint();
  try {
    await withTimeout(sequelize.query('SELECT 1'), DB_CHECK_TIMEOUT_MS);
    return { status: 'up', latencyMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6) };
  } catch (error) {
    // Текст ошибки драйвера может содержать адрес БД — наружу отдаём только статус.
    return { status: 'down', reason: error.message === 'timeout' ? 'timeout' : 'query_failed' };
  }
}

module.exports = { checkDatabase };
