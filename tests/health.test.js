const request = require('supertest');
const createApp = require('../src/app');
const { prepareDatabase, closeDatabase } = require('./helpers/db');

const app = createApp();

beforeAll(prepareDatabase);
afterAll(closeDatabase);

describe('GET /health (liveness)', () => {
  test('отвечает 200 и {status: "ok"} без обращения к БД и без токена', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('отдаёт заголовки безопасности и не раскрывает стек', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  test('отклоняет лишние query-параметры (источник без схемы обязан быть пустым)', async () => {
    const response = await request(app).get('/health?debug=1');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /health/ready (readiness)', () => {
  test('проверяет БД и возвращает 200 со статусом up', async () => {
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.checks.database.status).toBe('up');
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });
});

describe('Неизвестные маршруты', () => {
  test('возвращают 404 в едином JSON-формате', async () => {
    const response = await request(app).get('/no-such-route');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
