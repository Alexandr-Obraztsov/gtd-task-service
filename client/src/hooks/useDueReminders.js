import { useEffect, useState } from 'react';
import { listDueReminders } from '../api/tasks';
import { isCancelled, normalizeError } from '../api/errors';

const POLL_INTERVAL_MS = 30000;

// Polling напоминаний: опрос раз в 30 с, пока вкладка видима; при уходе со страницы
// таймер и незавершённый запрос отменяются.
export function useDueReminders() {
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let controller = new AbortController();

    function load() {
      controller.abort();
      controller = new AbortController();
      listDueReminders(controller.signal)
        .then((page) => setState({ loading: false, items: page.items, error: null }))
        .catch((error) => {
          if (!isCancelled(error)) {
            setState((current) => ({ ...current, loading: false, error: normalizeError(error) }));
          }
        });
    }

    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [reloadKey]);

  return { ...state, reload: () => setReloadKey((key) => key + 1) };
}
