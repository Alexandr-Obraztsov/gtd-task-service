const Joi = require('joi');
const { sequelize, syncDatabase, User, Context, Task } = require('../src/models');
const { ROLES } = require('../src/utils/roles');
const { TASK_STATUS } = require('../src/utils/taskStatus');
const { hashPassword } = require('../src/utils/password');
const { email, password } = require('../src/validators/common');
const { logger } = require('../src/utils/logger');

const SEED_ACCOUNTS = Object.freeze([
  { role: ROLES.ADMIN, emailVar: 'SEED_ADMIN_EMAIL', passwordVar: 'SEED_ADMIN_PASSWORD' },
  { role: ROLES.MODERATOR, emailVar: 'SEED_MODERATOR_EMAIL', passwordVar: 'SEED_MODERATOR_PASSWORD' },
  { role: ROLES.USER, emailVar: 'SEED_USER_EMAIL', passwordVar: 'SEED_USER_PASSWORD' },
]);

const credentialsSchema = Joi.object({
  email: email.required(),
  password: password.required(),
});

const DEMO_CONTEXTS = Object.freeze([
  { name: '@home', isPublic: false },
  { name: '@work', isPublic: true },
  { name: '@calls', isPublic: true },
]);

const HOUR_MS = 60 * 60 * 1000;

function readCredentials({ emailVar, passwordVar }) {
  const { value, error } = credentialsSchema.validate({
    email: process.env[emailVar],
    password: process.env[passwordVar],
  });
  if (error) {
    throw new Error(`${emailVar}/${passwordVar}: ${error.message}`);
  }
  return value;
}

async function upsertAccount(account) {
  const credentials = readCredentials(account);
  const passwordHash = await hashPassword(credentials.password);
  const [user] = await User.findOrCreate({
    where: { email: credentials.email },
    defaults: { passwordHash, role: account.role },
  });
  await user.update({ passwordHash, role: account.role, failedAttempts: 0, lockUntil: null });
  logger.info('seed_account_ready', { email: user.email, role: user.role });
  return user;
}

async function seedDemoData(owner) {
  const contexts = await Promise.all(
    DEMO_CONTEXTS.map(async ({ name, isPublic }) => {
      const [context] = await Context.findOrCreate({ where: { ownerId: owner.id, name }, defaults: { isPublic } });
      return context.update({ isPublic });
    }),
  );
  const existingTasks = await Task.count({ where: { ownerId: owner.id } });
  if (existingTasks > 0) {
    return;
  }
  const [home, work, calls] = contexts;
  await Task.bulkCreate([
    { title: 'Позвонить в деканат', status: TASK_STATUS.NEXT, contextId: calls.id, ownerId: owner.id, remindAt: new Date(Date.now() - HOUR_MS) },
    { title: 'Купить продукты', status: TASK_STATUS.INBOX, contextId: home.id, ownerId: owner.id },
    { title: 'Сдать курсовой проект', status: TASK_STATUS.SCHEDULED, contextId: work.id, ownerId: owner.id, dueDate: new Date(Date.now() + 72 * HOUR_MS), remindAt: new Date(Date.now() + 48 * HOUR_MS) },
  ]);
}

async function seed() {
  await syncDatabase();
  const users = [];
  for (const account of SEED_ACCOUNTS) {
    users.push(await upsertAccount(account));
  }
  await seedDemoData(users.find((user) => user.role === ROLES.USER));
  logger.info('seed_completed');
}

seed()
  .catch((error) => {
    logger.error('seed_failed', { message: error.message });
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
