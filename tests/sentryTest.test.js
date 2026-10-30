const request = require('supertest');
const createApp = require('../src/app');
const sentry = require('../src/utils/sentry');
const { prepareDatabase, cleanupDatabase, closeDatabase, loginAs } = require('./helpers/db');
const { ROLES } = require('../src/utils/roles');

const app = createApp();
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(prepareDatabase);
afterAll(async () => {
  await cleanupDatabase();
  await closeDatabase();
});
afterEach(() => jest.restoreAllMocks());

describe('POST /debug/sentry-test', () => {
  test('без токена — 401, ошибка не создаётся', async () => {
    const capture = jest.spyOn(sentry, 'captureException');
    const response = await request(app).post('/debug/sentry-test');
    expect(response.status).toBe(401);
    expect(capture).not.toHaveBeenCalled();
  });

  test('обычному пользователю — 403, ошибка не создаётся', async () => {
    const capture = jest.spyOn(sentry, 'captureException');
    const token = await loginAs(app, ROLES.USER);
    const response = await request(app).post('/debug/sentry-test').set(bearer(token));
    expect(response.status).toBe(403);
    expect(capture).not.toHaveBeenCalled();
  });

  test('GET не поддерживается (маршрут только POST)', async () => {
    const token = await loginAs(app, ROLES.ADMIN);
    const response = await request(app).get('/debug/sentry-test').set(bearer(token));
    expect(response.status).toBe(404);
  });

  test('администратору возвращает 500 и передаёт ошибку в Sentry', async () => {
    const capture = jest.spyOn(sentry, 'captureException').mockReturnValue(undefined);
    const token = await loginAs(app, ROLES.ADMIN);
    const response = await request(app).post('/debug/sentry-test').set(bearer(token));
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][0].message).toContain('Тестовая ошибка');
    expect(capture.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST', path: '/debug/sentry-test' }));
  });
});

describe('Sentry выключен без SENTRY_DSN', () => {
  test('initSentry не включает отправку, captureException ничего не делает', () => {
    expect(sentry.initSentry()).toBe(false);
    expect(sentry.isSentryEnabled()).toBe(false);
    expect(sentry.captureException(new Error('x'))).toBeUndefined();
  });
});
