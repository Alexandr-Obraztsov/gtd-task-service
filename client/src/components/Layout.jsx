import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from './Feedback';

export default function Layout() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          GTD Tasks
        </Link>
        <nav aria-label="Основная навигация">
          <NavLink to="/" end>
            Главная
          </NavLink>
          {status === 'authenticated' && <NavLink to="/tasks">Задачи</NavLink>}
        </nav>
        <div className="topbar-user">
          {status === 'authenticated' && (
            <>
              <span className="user-chip">
                {user.email} · {user.role}
              </span>
              <button type="button" className="btn btn-small" onClick={handleLogout}>
                Выйти
              </button>
            </>
          )}
          {status === 'anonymous' && (
            <>
              <NavLink to="/login">Вход</NavLink>
              <NavLink to="/register">Регистрация</NavLink>
            </>
          )}
        </div>
      </header>
      <main className="content">
        <Suspense fallback={<Spinner label="Загружаем страницу…" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
