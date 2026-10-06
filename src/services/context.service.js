const { Context } = require('../models');
const { toPage } = require('../utils/pagination');
const { NotFoundError } = require('../utils/errors');
const { ACTIONS, resolveOwnerScope, loadAccessible } = require('./accessPolicy');

const RESOURCE_TYPE = 'Context';

function loadContext(actor, id, action) {
  return loadAccessible(Context, id, actor, action, RESOURCE_TYPE);
}

async function listContexts(actor, { ownerId, limit, offset }) {
  const scopedOwnerId = resolveOwnerScope(actor, ownerId, RESOURCE_TYPE);
  const where = scopedOwnerId === undefined ? {} : { ownerId: scopedOwnerId };
  const result = await Context.findAndCountAll({ where, limit, offset, order: [['name', 'ASC']] });
  return toPage(result, { limit, offset });
}

function getContext(actor, id) {
  return loadContext(actor, id, ACTIONS.READ);
}

function createContext(actor, { name }) {
  return Context.create({ name, ownerId: actor.id }, { fields: ['name', 'ownerId'] });
}

async function updateContext(actor, id, { name }) {
  const context = await loadContext(actor, id, ACTIONS.UPDATE);
  return context.update({ name }, { fields: ['name'] });
}

async function deleteContext(actor, id) {
  const context = await loadContext(actor, id, ACTIONS.DELETE);
  await context.destroy();
}

async function ensureContextOwnedBy(ownerId, contextId) {
  if (contextId === null || contextId === undefined) {
    return;
  }
  const context = await Context.findOne({ where: { id: contextId, ownerId } });
  if (!context) {
    throw new NotFoundError(`Контекст с id=${contextId} не найден среди контекстов владельца задачи`);
  }
}

module.exports = {
  listContexts,
  getContext,
  createContext,
  updateContext,
  deleteContext,
  ensureContextOwnedBy,
};
