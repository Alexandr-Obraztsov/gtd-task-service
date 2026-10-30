// Счётчики для замеров: число рендеров компонентов, коммиты Profiler и запросы к API.
// Доступны в консоли как window.__perf; на работу приложения не влияют.
export const stats = {
  renders: {},
  commits: { count: 0, actualDuration: 0 },
  requests: [],
};

export function countRender(name) {
  stats.renders[name] = (stats.renders[name] ?? 0) + 1;
}

export function trackRequest(method, url) {
  stats.requests.push({ method: method.toUpperCase(), url, t: Math.round(performance.now()) });
}

export function onProfilerRender(id, phase, actualDuration) {
  stats.commits.count += 1;
  stats.commits.actualDuration += actualDuration;
}

export function resetStats() {
  stats.renders = {};
  stats.commits = { count: 0, actualDuration: 0 };
  stats.requests = [];
}

if (typeof window !== 'undefined') {
  window.__perf = { stats, resetStats };
}
