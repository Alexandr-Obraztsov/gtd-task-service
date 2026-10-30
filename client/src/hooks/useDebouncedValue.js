import { useEffect, useState } from 'react';

// Возвращает value с задержкой: пока пользователь печатает, значение не меняется,
// и зависящий от него эффект (запрос к API) не запускается на каждый символ.
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
