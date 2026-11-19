// Генерирует демонстрационный набор задач для замеров производительности клиента.
// Запуск: npm run seed:demo [количество]; повторный запуск добирает недостающие.
const { sequelize, syncDatabase, User, Context, Task } = require('../src/models');
const { TASK_STATUS, TASK_STATUS_VALUES } = require('../src/utils/taskStatus');
const { logger } = require('../src/utils/logger');

const DEFAULT_COUNT = 240;
const DAY_MS = 24 * 60 * 60 * 1000;

const VERBS = ['Позвонить', 'Написать', 'Проверить', 'Подготовить', 'Купить', 'Обсудить', 'Отправить', 'Оплатить'];
const OBJECTS = [
  'отчёт по лабораторной', 'в деканат', 'преподавателю', 'план спринта', 'продукты на неделю',
  'договор аренды', 'письмо в поддержку', 'счёт за интернет', 'презентацию', 'код-ревью',
  'расписание зачётов', 'билеты на поезд', 'резервную копию', 'заметки со встречи', 'список литературы',
];

function buildTask(index, ownerId, contextIds) {
  const status = TASK_STATUS_VALUES[index % TASK_STATUS_VALUES.length];
  const task = {
    title: `${VERBS[index % VERBS.length]} ${OBJECTS[(index * 7) % OBJECTS.length]} №${index + 1}`,
    notes: index % 3 === 0 ? 'Демонстрационная задача для замеров производительности.' : '',
    status,
    ownerId,
    contextId: index % 4 === 0 ? null : contextIds[index % contextIds.length],
  };
  if (status === TASK_STATUS.SCHEDULED || index % 5 === 0) {
    task.dueDate = new Date(Date.now() + ((index % 30) - 5) * DAY_MS);
  }
  if (index % 6 === 0 && status !== TASK_STATUS.DONE) {
    task.remindAt = new Date(Date.now() + ((index % 10) - 4) * DAY_MS);
  }
  return task;
}

async function seedDemo() {
  const count = Number.parseInt(process.argv[2], 10) || DEFAULT_COUNT;
  await syncDatabase();
  const owner = await User.findOne({ where: { email: process.env.SEED_USER_EMAIL } });
  if (!owner) {
    throw new Error('Сначала выполните npm run seed');
  }
  const contexts = await Context.findAll({ where: { ownerId: owner.id } });
  const existing = await Task.count({ where: { ownerId: owner.id } });
  const rows = [];
  for (let index = existing; index < count; index += 1) {
    rows.push(buildTask(index, owner.id, contexts.map((context) => context.id)));
  }
  await Task.bulkCreate(rows);
  logger.info('seed_demo_completed', { added: rows.length, total: existing + rows.length });
}

seedDemo()
  .catch((error) => {
    logger.error('seed_demo_failed', { message: error.message });
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
