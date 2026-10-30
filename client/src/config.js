// Базовый URL API задаётся на этапе сборки (VITE_API_URL); слеш в конце убирается.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
