class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details, headers } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message = 'Некорректные данные запроса', details) {
    super(message, { status: 400, code: 'VALIDATION_ERROR', details });
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Требуется аутентификация', code = 'UNAUTHORIZED') {
    super(message, { status: 401, code });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Недостаточно прав для выполнения операции', code = 'FORBIDDEN') {
    super(message, { status: 403, code });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ресурс не найден') {
    super(message, { status: 404, code: 'NOT_FOUND' });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Конфликт данных') {
    super(message, { status: 409, code: 'CONFLICT' });
  }
}

class PayloadTooLargeError extends AppError {
  constructor(message = 'Размер тела запроса превышает допустимый') {
    super(message, { status: 413, code: 'PAYLOAD_TOO_LARGE' });
  }
}

class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Тело запроса должно иметь Content-Type: application/json') {
    super(message, { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
  }
}

class LockedError extends AppError {
  constructor(message, retryAfterSeconds) {
    super(message, {
      status: 423,
      code: 'ACCOUNT_LOCKED',
      headers: { 'Retry-After': String(retryAfterSeconds) },
    });
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Слишком много запросов, повторите позже') {
    super(message, { status: 429, code: 'TOO_MANY_REQUESTS' });
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  LockedError,
  TooManyRequestsError,
};
