const metrics = require('../../src/monitoring/metrics');

beforeEach(() => metrics.reset());

describe('monitoring/metrics', () => {
  test('statusClass группирует коды по сотням', () => {
    expect(metrics.statusClass(200)).toBe('2xx');
    expect(metrics.statusClass(304)).toBe('3xx');
    expect(metrics.statusClass(404)).toBe('4xx');
    expect(metrics.statusClass(503)).toBe('5xx');
    expect(metrics.statusClass(999)).toBe('5xx');
  });

  test('считает запросы, среднее время и запросы в обработке', () => {
    metrics.requestStarted();
    metrics.requestStarted();
    expect(metrics.snapshot().requests.inFlight).toBe(2);
    metrics.requestFinished(200, 10);
    metrics.requestFinished(500, 30);
    const { requests } = metrics.snapshot();
    expect(requests.total).toBe(2);
    expect(requests.inFlight).toBe(0);
    expect(requests.averageDurationMs).toBe(20);
    expect(requests.byStatusClass['2xx']).toBe(1);
    expect(requests.byStatusClass['5xx']).toBe(1);
  });

  test('inFlight не уходит в минус', () => {
    metrics.requestFinished(200, 1);
    expect(metrics.snapshot().requests.inFlight).toBe(0);
  });

  test('snapshot содержит память в мегабайтах и uptime', () => {
    const snapshot = metrics.snapshot();
    expect(snapshot.process.memory.rssMb).toBeGreaterThan(0);
    expect(snapshot.process.memory.heapUsedMb).toBeLessThanOrEqual(snapshot.process.memory.heapTotalMb);
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
