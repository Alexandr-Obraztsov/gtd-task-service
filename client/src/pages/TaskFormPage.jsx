import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listContexts } from '../api/contexts';
import { fieldErrors, isCancelled, normalizeError } from '../api/errors';
import { createTask, getTask, replaceTask } from '../api/tasks';
import { ErrorMessage, Spinner } from '../components/Feedback';
import { STATUS_LABELS, STATUS_VALUES, fromInputValue, toInputValue } from '../utils/format';

const EMPTY_FORM = { title: '', notes: '', status: 'inbox', dueDate: '', remindAt: '', contextId: '' };

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Введите название задачи';
  if (form.title.length > 200) errors.title = 'Не более 200 символов';
  if (form.notes.length > 2000) errors.notes = 'Не более 2000 символов';
  if (form.status === 'scheduled' && !form.dueDate) errors.dueDate = 'Для статуса «Запланировано» нужен срок';
  return errors;
}

function toPayload(form) {
  return {
    title: form.title.trim(),
    notes: form.notes,
    status: form.status,
    dueDate: fromInputValue(form.dueDate),
    remindAt: fromInputValue(form.remindAt),
    contextId: form.contextId === '' ? null : Number(form.contextId),
  };
}

function toForm(task) {
  return {
    title: task.title,
    notes: task.notes,
    status: task.status,
    dueDate: toInputValue(task.dueDate),
    remindAt: toInputValue(task.remindAt),
    contextId: task.contextId == null ? '' : String(task.contextId),
  };
}

export default function TaskFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listContexts(controller.signal)
      .then(setContexts)
      .catch(() => {});
    if (isEdit) {
      getTask(id, controller.signal)
        .then((task) => {
          setForm(toForm(task));
          setLoading(false);
        })
        .catch((error) => {
          if (!isCancelled(error)) {
            setLoadError(normalizeError(error));
            setLoading(false);
          }
        });
    }
    return () => controller.abort();
  }, [id, isEdit]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const saved = isEdit ? await replaceTask(id, toPayload(form)) : await createTask(toPayload(form));
      navigate(`/tasks/${saved.id}`);
    } catch (error) {
      const normalized = normalizeError(error);
      setErrors(fieldErrors(normalized));
      setSubmitError(normalized);
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Загружаем задачу…" />;
  if (loadError) return <ErrorMessage error={loadError} />;

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h1>{isEdit ? 'Редактирование задачи' : 'Новая задача'}</h1>

      <label>
        Название
        <input name="title" value={form.title} onChange={handleChange} maxLength={200} autoFocus />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </label>

      <label>
        Заметки
        <textarea name="notes" rows={4} value={form.notes} onChange={handleChange} />
        {errors.notes && <span className="field-error">{errors.notes}</span>}
      </label>

      <div className="form-row">
        <label>
          Статус
          <select name="status" value={form.status} onChange={handleChange}>
            {STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Контекст
          <select name="contextId" value={form.contextId} onChange={handleChange}>
            <option value="">Без контекста</option>
            {contexts.map((context) => (
              <option key={context.id} value={context.id}>
                {context.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label>
          Срок
          <input type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange} />
          {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
        </label>
        <label>
          Напоминание
          <input type="datetime-local" name="remindAt" value={form.remindAt} onChange={handleChange} />
          {errors.remindAt && <span className="field-error">{errors.remindAt}</span>}
        </label>
      </div>

      {submitError && <ErrorMessage error={submitError} />}

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
        <Link className="btn" to={isEdit ? `/tasks/${id}` : '/tasks'}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
