const { Context } = require('../models');
const { toPage } = require('../utils/pagination');
const { pickDefined } = require('../utils/object');
const { NotFoundError } = require('../utils/errors');
const { ACTIONS, resolveOwnerScope, loadAccessible } = require('./accessPolicy');

const RESOURCE_TYPE = 'Context';
const WRITABLE_FIELDS = Object.freeze(['name', 'isPublic']);
const PUBLIC_ATTRIBUTES = Object.freeze(['id', 'name', 'createdAt']);

function loadContext(actor, id, action) {
  return loadAccessible(Context, id, actor, action, RESOURCE_TYPE);
}

async function listContexts(actor, { ownerId, limit, offset }) {
  const scopedOwnerId = resolveOwnerScope(actor, ownerId, RESOURCE_TYPE);
  const where = scopedOwnerId === undefined ? {} : { ownerId: scopedOwnerId };
  const result = await Context.findAndCountAll({ where, limit, offset, order: [['name', 'ASC']] });
  return toPage(result, { limit, offset });
}

async function listPublicContexts({ limit, offset }) {
  const result = await Context.findAndCountAll({
    where: { isPublic: true },
    attributes: [...PUBLIC_ATTRIBUTES],
    limit,
    offset,
    order: [['name', 'ASC'], ['id', 'ASC']],
  });
  return toPage(result, { limit, offset });
}

function getContext(actor, id) {
  return loadContext(actor, id, ACTIONS.READ);
}

function createContext(actor, input) {
  const attributes = { ...pickDefined(input, WRITABLE_FIELDS), ownerId: actor.id };
  return Context.create(attributes, { fields: [...WRITABLE_FIELDS, 'ownerId'] });
}

async function updateContext(actor, id, input) {
  const context = await loadContext(actor, id, ACTIONS.UPDATE);
  return context.update(pickDefined(input, WRITABLE_FIELDS), { fields: [...WRITABLE_FIELDS] });
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
  listPublicContexts,
  listContexts,
  getContext,
  createContext,
  updateContext,
  deleteContext,
  ensureContextOwnedBy,
};
