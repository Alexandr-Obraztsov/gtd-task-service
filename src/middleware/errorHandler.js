const { UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const config = require('../config/env');
const { logger } = require('../utils/logger');
const {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
} = require('../utils/errors');

const GENERIC_SERVER_MESSAGE = 'Внутренняя ошибка сервера';

const BODY_PARSER_ERRORS = Object.freeze({
  'entity.too.large': () => new PayloadTooLargeError(),
  'entity.parse.failed': () => new ValidationError('Тело запроса содержит некорректный JSON'),
  'encoding.unsupported': () => new ValidationError('Неподдерживаемая кодировка тела запроса'),
});

function toAppError(error) {
  if (error instanceof AppError) {
    return error;
  }
  if (BODY_PARSER_ERRORS[error.type]) {
    return BODY_PARSER_ERRORS[error.type]();
  }
  if (error instanceof UniqueConstraintError) {
    return new ConflictError('Запись с такими данными уже существует');
  }
  if (error instanceof ForeignKeyConstraintError) {
    return new ValidationError('Ссылка на несуществующую связанную запись');
  }
  return null;
}

function buildBody(appError, originalError) {
  const body = { code: appError.code, message: appError.message };
  if (appError.details) {
    body.details = appError.details;
  }
  if (!config.isProduction && originalError) {
    body.debug = { name: originalError.name, message: originalError.message, stack: originalError.stack };
  }
  return { error: body };
}

function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Маршрут ${req.method} ${req.path} не найден`));
}

function errorHandler(error, req, res, next) {
  const knownError = toAppError(error);

  if (knownError) {
    if (knownError.status >= 500) {
      logger.error(knownError.message, { stack: knownError.stack, path: req.originalUrl });
    }
    res.set(knownError.headers || {});
    res.status(knownError.status).json(buildBody(knownError));
    return;
  }

  logger.error(error.message, { name: error.name, stack: error.stack, method: req.method, path: req.originalUrl });
  const serverError = new AppError(GENERIC_SERVER_MESSAGE);
  res.status(serverError.status).json(buildBody(serverError, error));
}

module.exports = { notFoundHandler, errorHandler };
