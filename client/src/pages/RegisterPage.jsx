import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { fieldErrors, normalizeError } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/Feedback';

export default function RegisterPage() {
  const { status, register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/tasks" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const email = form.email.trim();
      await register(email, form.password);
      await login(email, form.password);
      navigate('/tasks', { replace: true });
    } catch (caught) {
      setError(normalizeError(caught));
      setPending(false);
    }
  }

  const errors = error ? fieldErrors(error) : {};
  return (
    <form className="card form narrow" onSubmit={handleSubmit}>
      <h1>Регистрация</h1>
      <label>
        Email
        <input
          type="email"
          autoComplete="username"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </label>
      <label>
        Пароль
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <span className="hint">8–72 символа: буква, цифра и спецсимвол</span>
        {errors.password && <span className="field-error">{errors.password}</span>}
      </label>
      {error && <ErrorMessage error={error} />}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Создание…' : 'Создать аккаунт'}
      </button>
      <p>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </form>
  );
}
