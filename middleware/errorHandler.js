function notFoundHandler(req, res) {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
}

function errorHandler(err, req, res, next) {
  console.error(err.stack);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }

  res.status(err.status || 500).json({ error: err.message || 'Внутренняя ошибка сервера' });
}

module.exports = { notFoundHandler, errorHandler };
