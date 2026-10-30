import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listContexts } from '../api/contexts';
import { isCancelled, normalizeError } from '../api/errors';
import { deleteTask, getTask } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage, Spinner } from '../components/Feedback';
import { STATUS_LABELS, formatDate } from '../utils/format';

export default function TaskDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, task: null, contextName: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, task: null, contextName: null, error: null });
    Promise.all([getTask(id, controller.signal), listContexts(controller.signal).catch(() => [])])
      .then(([task, contexts]) => {
        const context = contexts.find((item) => item.id === task.contextId);
        setState({ loading: false, task, contextName: context?.name ?? null, error: null });
      })
      .catch((error) => {
        if (!isCancelled(error)) {
          setState({ loading: false, task: null, contextName: null, error: normalizeError(error) });
        }
      });
    return () => controller.abort();
  }, [id, reloadKey]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Удалить задачу безвозвратно?')) return;
    try {
      await deleteTask(id);
      navigate('/tasks');
    } catch (error) {
      setDeleteError(normalizeError(error));
    }
  }, [id, navigate]);

  const { loading, task, contextName, error } = state;
  if (loading) return <Spinner label="Загружаем задачу…" />;
  if (error) {
    return (
      <>
        <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : () => setReloadKey((key) => key + 1)} />
        <Link to="/tasks">← К списку задач</Link>
      </>
    );
  }

  return (
    <article className="card">
      <p>
        <Link to="/tasks">← К списку задач</Link>
      </p>
      <h1>{task.title}</h1>
      <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
      <dl className="details">
        <dt>Заметки</dt>
        <dd>{task.notes || '—'}</dd>
        <dt>Контекст</dt>
        <dd>{contextName ?? '—'}</dd>
        <dt>Срок</dt>
        <dd>{formatDate(task.dueDate)}</dd>
        <dt>Напоминание</dt>
        <dd>{formatDate(task.remindAt)}</dd>
        <dt>Создана</dt>
        <dd>{formatDate(task.createdAt)}</dd>
        <dt>Изменена</dt>
        <dd>{formatDate(task.updatedAt)}</dd>
      </dl>
      {deleteError && <ErrorMessage error={deleteError} />}
      <div className="actions">
        <Link className="btn btn-primary" to={`/tasks/${task.id}/edit`}>
          Редактировать
        </Link>
        {user.role === 'admin' && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Удалить
          </button>
        )}
      </div>
    </article>
  );
}
