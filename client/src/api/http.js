import axios from 'axios';
import { API_URL } from '../config';
import { trackRequest } from '../perf/stats';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, // отправлять/принимать httpOnly-cookie с refresh-токеном
  timeout: 15000,
});

let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Один общий запрос обновления токена: параллельные 401 (и двойной эффект
// React StrictMode) не должны отправлять один refresh-cookie дважды, иначе сервер
// сочтёт повтор кражей токена и отзовёт все сессии.
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = http
      .post('/auth/refresh', null, { skipAuthRefresh: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

http.interceptors.request.use((config) => {
  trackRequest(config.method ?? 'get', `${config.url}${config.params ? `?${new URLSearchParams(config.params)}` : ''}`);
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const expired = response?.status === 401 && response.data?.error?.code === 'TOKEN_EXPIRED';
    if (!expired || !config || config.skipAuthRefresh || config.retried) {
      return Promise.reject(error);
    }
    try {
      await refreshSession();
    } catch (refreshError) {
      clearAccessToken();
      onSessionExpired();
      return Promise.reject(error);
    }
    return http({ ...config, retried: true });
  },
);
