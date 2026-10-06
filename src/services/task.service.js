const { Op } = require('sequelize');
const { Task } = require('../models');
const { TASK_STATUS } = require('../utils/taskStatus');
const { pickDefined } = require('../utils/object');
const { toPage } = require('../utils/pagination');
const { ValidationError } = require('../utils/errors');
const { ACTIONS, resolveOwnerScope, loadAccessible } = require('./accessPolicy');
const { ensureContextOwnedBy } = require('./context.service');

const RESOURCE_TYPE = 'Task';
const WRITABLE_FIELDS = Object.freeze(['title', 'notes', 'status', 'dueDate', 'remindAt', 'contextId']);
const LIST_ORDER = Object.freeze([['dueDate', 'ASC NULLS LAST'], ['id', 'ASC']]);

function loadTask(actor, id, action) {
  return loadAccessible(Task, id, actor, action, RESOURCE_TYPE);
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

async function deleteTask(actor, id) {
  const task = await loadTask(actor, id, ACTIONS.DELETE);
  await task.destroy();
}

module.exports = { listTasks, listDueReminders, getTask, createTask, updateTask, deleteTask };
