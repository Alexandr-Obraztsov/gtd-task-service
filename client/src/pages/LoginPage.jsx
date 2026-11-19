import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fieldErrors, normalizeError } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { ErrorMessage } from '../components/Feedback';

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      await login(form.email.trim(), form.password);
      navigate(location.state?.from ?? '/tasks', { replace: true });
    } catch (caught) {
      setError(normalizeError(caught));
      setPending(false);
    }
  }

  const errors = error ? fieldErrors(error) : {};
  return (
    <form className="card form narrow" onSubmit={handleSubmit}>
      <h1>Вход</h1>
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
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        {errors.password && <span className="field-error">{errors.password}</span>}
      </label>
      {error && <ErrorMessage error={error} />}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Вход…' : 'Войти'}
      </button>
      <p>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </form>
  );
}
