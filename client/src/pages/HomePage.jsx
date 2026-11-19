import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorMessage, Spinner } from '../components/Feedback';
import { useDueReminders } from '../hooks/useDueReminders';
import { STATUS_LABELS, formatDate } from '../utils/format';

function Reminders() {
  const { loading, items, error, reload } = useDueReminders();
  if (loading) return <Spinner label="Загружаем напоминания…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  if (items.length === 0) {
    return <EmptyState title="Нет просроченных напоминаний" hint="Список обновляется раз в 30 секунд." />;
  }
  return (
    <ul className="task-list">
      {items.map((task) => (
        <li key={task.id} className="task-item">
          <div className="task-main">
            <Link className="task-title" to={`/tasks/${task.id}`}>
              {task.title}
            </Link>
            <div className="task-meta">
              <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
              <span>напомнить: {formatDate(task.remindAt)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  const { status, user } = useAuth();

  if (status === 'authenticated') {
    return (
      <section>
        <h1>Добро пожаловать, {user.email}</h1>
        <p className="lead">Сегодня к вам просятся эти напоминания.</p>
        <h2>Напоминания</h2>
        <Reminders />
        <p>
          <Link className="btn btn-primary" to="/tasks">
            Перейти к задачам
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="hero">
      <h1>GTD Tasks</h1>
      <p className="lead">
        Сервис планирования задач по методу Getting Things Done: входящие, контексты, сроки и напоминания.
      </p>
      <p>
        <Link className="btn btn-primary" to="/login">
          Войти
        </Link>{' '}
        <Link className="btn" to="/register">
          Зарегистрироваться
        </Link>
      </p>
    </section>
  );
}
