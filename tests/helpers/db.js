const { Op } = require('sequelize');
const request = require('supertest');
const { sequelize, syncDatabase, User } = require('../../src/models');
const { hashPassword } = require('../../src/utils/password');
const { ROLES } = require('../../src/utils/roles');

const TEST_EMAIL_SUFFIX = '@jest.gtd.test';
const TEST_PASSWORD = 'Test#Pass123';

let counter = 0;

async function prepareDatabase() {
  await syncDatabase();
}

async function createUser(role = ROLES.USER) {
  counter += 1;
  const email = `${role}-${process.pid}-${Date.now()}-${counter}${TEST_EMAIL_SUFFIX}`;
  await User.create({ email, passwordHash: await hashPassword(TEST_PASSWORD), role });
  return { email, password: TEST_PASSWORD };
}

async function loginAs(app, role) {
  const credentials = await createUser(role);
  const response = await request(app).post('/auth/login').send(credentials);
  if (response.status !== 200) {
    throw new Error(`Не удалось войти в тесте: ${response.status}`);
  }
  return response.body.accessToken;
}

async function cleanupDatabase() {
  await User.destroy({ where: { email: { [Op.like]: `%${TEST_EMAIL_SUFFIX}` } } });
}

async function closeDatabase() {
  await sequelize.close();
}

module.exports = { prepareDatabase, createUser, loginAs, cleanupDatabase, closeDatabase, TEST_PASSWORD };
