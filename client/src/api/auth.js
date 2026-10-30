import { http, refreshSession } from './http';
import { clearAccessToken, setAccessToken } from './tokenStore';

export async function login(email, password) {
  const { data } = await http.post('/auth/login', { email, password }, { skipAuthRefresh: true });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function register(email, password) {
  const { data } = await http.post('/auth/register', { email, password }, { skipAuthRefresh: true });
  return data.user;
}

export async function logout() {
  try {
    await http.post('/auth/logout', null, { skipAuthRefresh: true });
  } finally {
    clearAccessToken();
  }
}

// Восстановление сессии после перезагрузки: refresh-cookie -> новый access-токен в памяти.
export async function restoreSession() {
  const data = await refreshSession();
  return data.user;
}
