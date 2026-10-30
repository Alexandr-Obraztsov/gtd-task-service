import { Profiler, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listContexts } from '../api/contexts';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback';
import { TaskItem } from '../components/TaskItem';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useTasksList } from '../hooks/useTasksList';
import { DEBOUNCE_MS, flags } from '../perf/flags';
import { onProfilerRender } from '../perf/stats';
import { STATUS_LABELS, STATUS_VALUES } from '../utils/format';

const PAGE_SIZE = 20;

export default function TaskListPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');
  const [contexts, setContexts] = useState([]);

  // Debounce: запрос уходит, когда пользователь 400 мс не печатает, а не на каждый символ.
  const debouncedSearch = useDebouncedValue(searchInput.trim(), DEBOUNCE_MS);
  const q = flags.debounce ? debouncedSearch : searchInput.trim();

  const { items, total, loading, error, mutationError, reload, create, remove, toggleDone, dismissMutationError } =
    useTasksList({ q, status, limit: PAGE_SIZE, offset: page * PAGE_SIZE });

  useEffect(() => {
    const controller = new AbortController();
    listContexts(controller.signal)
      .then(setContexts)
      .catch(() => {}); // имена контекстов — украшение, список задач работает и без них
    return () => controller.abort();
  }, []);

  const contextNames = useMemo(
    () => Object.fromEntries(contexts.map((context) => [context.id, context.name])),
    [contexts],
  );

  const handleCreate = useCallback(
    (event) => {
      event.preventDefault();
      const title = draft.trim();
      if (!title) return;
      setDraft('');
      create(title);
    },
    [create, draft],
  );

  const canDelete = user.role === 'admin';
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || status);

  function handleSearch(event) {
    setSearchInput(event.target.value);
    setPage(0);
  }

  function handleStatus(event) {
    setStatus(event.target.value);
    setPage(0);
  }

  let body;
  if (error) {
    body = <ErrorMessage error={error} onRetry={reload} />;
  } else if (loading && items.length === 0) {
    body = <Spinner label="Загружаем задачи…" />;
  } else if (items.length === 0) {
    body = filtered ? (
      <EmptyState title="Ничего не найдено" hint="Измените строку поиска или сбросьте фильтр статуса." />
    ) : (
      <EmptyState title="Задач пока нет" hint="Добавьте первую задачу в форме выше или создайте подробную.">
        <Link className="btn btn-primary" to="/tasks/new">
          Создать задачу
        </Link>
      </EmptyState>
    );
  } else {
    body = (
      <Profiler id="TaskList" onRender={onProfilerRender}>
        <ul className={`task-list${loading ? ' is-refreshing' : ''}`} aria-busy={loading}>
          {items.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              contextName={contextNames[task.contextId]}
              canDelete={canDelete}
              onToggle={toggleDone}
              onRemove={remove}
            />
          ))}
        </ul>
      </Profiler>
    );
  }

  return (
    <section>
      <div className="page-head">
        <h1>Задачи</h1>
        <Link className="btn btn-primary" to="/tasks/new">
          Новая задача
        </Link>
      </div>

      <form className="quick-add" onSubmit={handleCreate}>
        <input
          type="text"
          value={draft}
          maxLength={200}
          placeholder="Быстро добавить во входящие…"
          aria-label="Название новой задачи"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
          Добавить
        </button>
      </form>

      {mutationError && (
        <div className="state state-error" role="alert">
          <span>{mutationError.message}</span>
          <button type="button" className="btn btn-small" onClick={dismissMutationError}>
            Закрыть
          </button>
        </div>
      )}

      <div className="filters">
        <input
          type="search"
          value={searchInput}
          placeholder="Поиск по названию…"
          aria-label="Поиск по названию"
          onChange={handleSearch}
        />
        <select value={status} onChange={handleStatus} aria-label="Фильтр по статусу">
          <option value="">Все статусы</option>
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <span className="total">Всего: {total}</span>
      </div>

      {body}

      {!error && total > PAGE_SIZE && (
        <div className="pager">
          <button type="button" className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Назад
          </button>
          <span>
            Страница {page + 1} из {pages}
          </span>
          <button type="button" className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
            Вперёд
          </button>
        </div>
      )}
    </section>
  );
}
