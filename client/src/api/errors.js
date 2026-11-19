import axios from 'axios';

export function isCancelled(error) {
  return axios.isCancel(error);
}

// Приводит ошибку axios к единому виду { status, code, message, details }.
export function normalizeError(error) {
  const apiError = error?.response?.data?.error;
  if (apiError) {
    return {
      status: error.response.status,
      code: apiError.code,
      message: apiError.message,
      details: apiError.details ?? [],
    };
  }
  if (error?.response) {
    return { status: error.response.status, code: 'HTTP_ERROR', message: `Ошибка сервера (${error.response.status})`, details: [] };
  }
  if (error?.code === 'ECONNABORTED') {
    return { status: 0, code: 'TIMEOUT', message: 'Сервер не ответил вовремя. Повторите попытку.', details: [] };
  }
  return { status: 0, code: 'NETWORK_ERROR', message: 'Нет связи с сервером. Проверьте подключение.', details: [] };
}

// Ошибки валидации Joi -> { поле: сообщение } для подсветки полей формы.
export function fieldErrors(normalized) {
  return Object.fromEntries((normalized.details ?? []).map((item) => [item.field, item.message]));
}
