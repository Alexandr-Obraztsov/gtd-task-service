import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Режим `profiling` подменяет react-dom сборкой с поддержкой Profiler API
// (в обычной production-сборке <Profiler> ничего не измеряет).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: mode === 'profiling' ? { 'react-dom/client': 'react-dom/profiling' } : {},
  },
  server: { port: 5173, strictPort: true },
}));
