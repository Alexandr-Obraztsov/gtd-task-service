export const STATUS_LABELS = Object.freeze({
  inbox: 'Входящие',
  next: 'Следующие',
  waiting: 'Ожидание',
  scheduled: 'Запланировано',
  someday: 'Когда-нибудь',
  done: 'Готово',
});

export const STATUS_VALUES = Object.freeze(Object.keys(STATUS_LABELS));

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
}

const pad = (number) => String(number).padStart(2, '0');

// ISO (UTC) -> значение <input type="datetime-local"> в локальном времени.
export function toInputValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Значение <input type="datetime-local"> -> ISO (UTC) или null.
export function fromInputValue(value) {
  return value ? new Date(value).toISOString() : null;
}
