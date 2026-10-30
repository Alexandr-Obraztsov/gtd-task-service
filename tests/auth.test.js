const request = require('supertest');
const createApp = require('../src/app');
const { prepareDatabase, cleanupDatabase, closeDatabase, createUser, TEST_PASSWORD } = require('./helpers/db');

const app = createApp();

beforeAll(prepareDatabase);
afterAll(async () => {
  await cleanupDatabase();
  await closeDatabase();
});

describe('Защита маршрутов', () => {
  test.each(['/tasks', '/contexts', '/users', '/auth/me'])('GET %s без токена даёт 401 TOKEN_MISSING', async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_MISSING');
  });

  test('некорректный заголовок Authorization даёт 401 TOKEN_INVALID', async () => {
    const response = await request(app).get('/tasks').set('Authorization', 'Bearer not-a-jwt');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_INVALID');
  });

  test('подделанный JWT отклоняется', async () => {
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl';
    const response = await request(app).get('/tasks').set('Authorization', `Bearer ${forged}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_INVALID');
  });
});

describe('Валидация входных данных', () => {
  test('регистрация со слабым паролем и неверным email даёт 400 с русскими сообщениями', async () => {
    const response = await request(app).post('/auth/register').send({ email: 'not-an-email', password: '123' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fields = response.body.error.details.map((detail) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
    expect(response.body.error.details.every((detail) => /[а-яё]/i.test(detail.message))).toBe(true);
  });

  test('лишнее поле в теле запроса (mass assignment) отклоняется', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'someone@jest.gtd.test', password: TEST_PASSWORD, role: 'admin' });
    expect(response.status).toBe(400);
    expect(response.body.error.details.map((detail) => detail.field)).toContain('role');
  });

  test('битый JSON даёт 400, а не 500', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('не-JSON Content-Type даёт 415', async () => {
    const response = await request(app).post('/auth/login').set('Content-Type', 'text/plain').send('email=a');
    expect(response.status).toBe(415);
  });
});

describe('Вход', () => {
  test('верные данные дают access-токен и refresh-cookie с HttpOnly', async () => {
    const credentials = await createUser();
    const response = await request(app).post('/auth/login').send(credentials);
    expect(response.status).toBe(200);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
  });

  test('неверный пароль даёт 401 без раскрытия причины', async () => {
    const credentials = await createUser();
    const response = await request(app).post('/auth/login').send({ ...credentials, password: 'Wrong#Pass999' });
    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|stack/);
  });
});
