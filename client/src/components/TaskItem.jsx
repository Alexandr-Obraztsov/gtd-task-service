import { memo } from 'react';
import { Link } from 'react-router-dom';
import { flags } from '../perf/flags';
import { countRender } from '../perf/stats';
import { STATUS_LABELS, formatDate } from '../utils/format';

function TaskItemView({ task, contextName, canDelete, onToggle, onRemove }) {
  countRender('TaskItem');
  const done = task.status === 'done';
  return (
    <li className={`task-item${task.pending ? ' is-pending' : ''}${done ? ' is-done' : ''}`}>
      <input
        type="checkbox"
        checked={done}
        disabled={task.pending}
        onChange={() => onToggle(task.id)}
        aria-label={`Выполнено: ${task.title}`}
      />
      <div className="task-main">
        {task.pending ? (
          <span className="task-title">{task.title}</span>
        ) : (
          <Link className="task-title" to={`/tasks/${task.id}`}>
            {task.title}
          </Link>
        )}
        <div className="task-meta">
          <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
          {contextName && <span className="context">{contextName}</span>}
          {task.dueDate && <span>срок: {formatDate(task.dueDate)}</span>}
          {task.pending && <span>сохраняется…</span>}
        </div>
      </div>
      {canDelete && (
        <button
          type="button"
          className="btn btn-danger btn-small"
          disabled={task.pending}
          onClick={() => onRemove(task.id)}
        >
          Удалить
        </button>
      )}
    </li>
  );
}

// React.memo: строка перерисовывается, только если изменились её props.
// Колбэки приходят из родителя через useCallback, поэтому сравнение по ссылке работает.
export const TaskItem = flags.memo ? memo(TaskItemView) : TaskItemView;
