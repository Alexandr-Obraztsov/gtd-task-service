const { Op } = require('sequelize');
const { Task } = require('../models');
const { TASK_STATUS } = require('../utils/taskStatus');
const { pickDefined } = require('../utils/object');
const { toPage } = require('../utils/pagination');
const { ValidationError, ForbiddenError } = require('../utils/errors');
const { ROLES, hasRole } = require('../utils/roles');
const {
  ACTIONS,
  PRIVILEGED_ROLE_BY_ACTION,
  resolveOwnerScope,
  loadAccessible,
} = require('./accessPolicy');
const { ensureContextOwnedBy } = require('./context.service');

const RESOURCE_TYPE = 'Task';
const WRITABLE_FIELDS = Object.freeze(['title', 'notes', 'status', 'dueDate', 'remindAt', 'contextId']);
const LIST_ORDER = Object.freeze([['dueDate', 'ASC NULLS LAST'], ['id', 'ASC']]);
const FULL_UPDATE_DEFAULTS = Object.freeze({
  notes: '',
  status: TASK_STATUS.INBOX,
  dueDate: null,
  remindAt: null,
  contextId: null,
});
const TASK_ACCESS_POLICY = Object.freeze({
  ...PRIVILEGED_ROLE_BY_ACTION,
  [ACTIONS.UPDATE]: ROLES.ADMIN,
});

function loadTask(actor, id, action) {
  return loadAccessible(Task, id, actor, action, RESOURCE_TYPE, TASK_ACCESS_POLICY);
}

function ensureScheduledHasDueDate({ status, dueDate }) {
  if (status === TASK_STATUS.SCHEDULED && !dueDate) {
    throw new ValidationError('Для статуса scheduled поле "dueDate" обязательно');
  }
}

function buildListFilter(ownerId, { status, contextId, dueBefore }) {
  const where = pickDefined({ ownerId, status, contextId }, ['ownerId', 'status', 'contextId']);
  if (dueBefore) {
    where.dueDate = { [Op.lte]: dueBefore };
  }
  return where;
}

async function listTasks(actor, filters) {
  const ownerId = resolveOwnerScope(actor, filters.ownerId, RESOURCE_TYPE);
  const { limit, offset } = filters;
  const where = buildListFilter(ownerId, filters);
  const result = await Task.findAndCountAll({ where, limit, offset, order: LIST_ORDER });
  return toPage(result, { limit, offset });
}

async function listDueReminders(actor, { limit, offset }) {
  const result = await Task.findAndCountAll({
    where: {
      ownerId: actor.id,
      status: { [Op.ne]: TASK_STATUS.DONE },
      remindAt: { [Op.lte]: new Date() },
    },
    limit,
    offset,
    order: [['remindAt', 'ASC']],
  });
  return toPage(result, { limit, offset });
}

function getTask(actor, id) {
  return loadTask(actor, id, ACTIONS.READ);
}

async function createTask(actor, input) {
  const attributes = { ...pickDefined(input, WRITABLE_FIELDS), ownerId: actor.id };
  ensureScheduledHasDueDate(attributes);
  await ensureContextOwnedBy(actor.id, attributes.contextId);
  return Task.create(attributes, { fields: [...WRITABLE_FIELDS, 'ownerId'] });
}

async function updateTask(actor, id, input) {
  const task = await loadTask(actor, id, ACTIONS.UPDATE);
  const changes = pickDefined(input, WRITABLE_FIELDS);
  ensureScheduledHasDueDate({ ...task.get({ plain: true }), ...changes });
  await ensureContextOwnedBy(task.ownerId, changes.contextId);
  return task.update(changes, { fields: WRITABLE_FIELDS });
}

function replaceTask(actor, id, input) {
  return updateTask(actor, id, { ...FULL_UPDATE_DEFAULTS, ...input });
}

async function deleteTask(actor, id) {
  if (!hasRole(actor.role, ROLES.ADMIN)) {
    throw new ForbiddenError('Удалять задачи может только администратор', 'ADMIN_ONLY');
  }
  const task = await loadTask(actor, id, ACTIONS.DELETE);
  await task.destroy();
}

module.exports = {
  listTasks,
  listDueReminders,
  getTask,
  createTask,
  updateTask,
  replaceTask,
  deleteTask,
};
