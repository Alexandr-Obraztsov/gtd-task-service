const request = require('supertest');
const createApp = require('../src/app');
const metrics = require('../src/monitoring/metrics');
const { prepareDatabase, cleanupDatabase, closeDatabase, loginAs } = require('./helpers/db');
const { ROLES } = require('../src/utils/roles');

const app = createApp();
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(prepareDatabase);
afterAll(async () => {
  await cleanupDatabase();
  await closeDatabase();
});
beforeEach(() => metrics.reset());

describe('GET /metrics: доступ', () => {
  test('без токена — 401', async () => {
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_MISSING');
  });

  test('с неверным METRICS_TOKEN — 401', async () => {
    const response = await request(app).get('/metrics').set(bearer('x'.repeat(40)));
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_INVALID');
  });

  test('токен пользователя с ролью user — 403', async () => {
    const token = await loginAs(app, ROLES.USER);
    const response = await request(app).get('/metrics').set(bearer(token));
    expect(response.status).toBe(403);
  });

  test('токен администратора — 200', async () => {
    const token = await loginAs(app, ROLES.ADMIN);
    const response = await request(app).get('/metrics').set(bearer(token));
    expect(response.status).toBe(200);
  });

  test('лишний query-параметр отклоняется валидатором', async () => {
    const response = await request(app).get('/metrics?format=x').set(bearer(process.env.METRICS_TOKEN));
    expect(response.status).toBe(400);
  });
});

describe('GET /metrics: содержимое', () => {
  test('с METRICS_TOKEN возвращает uptime, память и счётчики, без кэширования', async () => {
    const response = await request(app).get('/metrics').set(bearer(process.env.METRICS_TOKEN));
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(response.body.process.memory).toEqual(
      expect.objectContaining({ rssMb: expect.any(Number), heapUsedMb: expect.any(Number) }),
    );
    expect(response.body.requests).toEqual(
      expect.objectContaining({ total: expect.any(Number), byStatusClass: expect.any(Object) }),
    );
  });

  test('счётчик растёт по обработанным запросам и разбивает их по классам статуса', async () => {
    await request(app).get('/health');
    await request(app).get('/health');
    await request(app).get('/no-such-route');
    const response = await request(app).get('/metrics').set(bearer(process.env.METRICS_TOKEN));
    expect(response.body.requests.total).toBe(3);
    expect(response.body.requests.byStatusClass['2xx']).toBe(2);
    expect(response.body.requests.byStatusClass['4xx']).toBe(1);
  });

  test('обращения к самим метрикам и дашборду в счётчик не попадают', async () => {
    await request(app).get('/metrics').set(bearer(process.env.METRICS_TOKEN));
    await request(app).get('/dashboard');
    const response = await request(app).get('/metrics').set(bearer(process.env.METRICS_TOKEN));
    expect(response.body.requests.total).toBe(0);
  });

  test('ответ не содержит секретов окружения', async () => {
    const response = await request(app).get('/metrics').set(bearer(process.env.METRICS_TOKEN));
    const text = JSON.stringify(response.body);
    expect(text).not.toContain(process.env.JWT_SECRET);
    expect(text).not.toContain(process.env.METRICS_TOKEN);
    expect(text).not.toContain('DATABASE_URL');
  });
});

describe('GET /dashboard', () => {
  test('отдаёт HTML-страницу без данных и с жёсткой CSP', async () => {
    const response = await request(app).get('/dashboard');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    const csp = response.headers['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(response.text).toContain('/dashboard/dashboard.js');
    expect(response.text).not.toMatch(/<script>[^<]/);
  });

  test('отдаёт скрипт и стили страницы', async () => {
    const script = await request(app).get('/dashboard/dashboard.js');
    expect(script.status).toBe(200);
    expect(script.headers['content-type']).toMatch(/javascript/);
    const styles = await request(app).get('/dashboard/dashboard.css');
    expect(styles.status).toBe(200);
    expect(styles.headers['content-type']).toMatch(/css/);
  });

  test('не отдаёт произвольные файлы каталога', async () => {
    const response = await request(app).get('/dashboard/..%2f..%2fapp.js');
    expect(response.status).toBe(404);
  });
});
