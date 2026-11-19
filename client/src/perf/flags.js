// Переключатели оптимизаций для замеров «до/после».
// По умолчанию все оптимизации включены; для базового замера открывают, например,
// http://localhost:5173/tasks?debounce=0&memo=0&optimistic=0.
// Значения читаются один раз при загрузке модуля (SPA-переходы страницу не перезагружают).
function readFlag(params, name) {
  return params.get(name) !== '0';
}

const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);

export const flags = Object.freeze({
  debounce: readFlag(params, 'debounce'),
  memo: readFlag(params, 'memo'),
  optimistic: readFlag(params, 'optimistic'),
});

export const DEBOUNCE_MS = 400;
