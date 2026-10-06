const { User } = require('../models');
const { pickDefined } = require('../utils/object');
const { toPage } = require('../utils/pagination');
const { NotFoundError, ConflictError } = require('../utils/errors');

async function findUserOrFail(id) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new NotFoundError(`Пользователь с id=${id} не найден`);
  }
  return user;
}

function ensureNotSelf(actor, targetId, message) {
  if (actor.id === targetId) {
    throw new ConflictError(message);
  }
}

async function listUsers({ role, limit, offset }) {
  const result = await User.findAndCountAll({
    where: pickDefined({ role }, ['role']),
    limit,
    offset,
    order: [['id', 'ASC']],
  });
  return toPage(result, { limit, offset });
}

async function changeUserRole(actor, id, role) {
  ensureNotSelf(actor, id, 'Нельзя изменить собственную роль');
  const user = await findUserOrFail(id);
  return user.update({ role }, { fields: ['role'] });
}

async function deleteUser(actor, id) {
  ensureNotSelf(actor, id, 'Нельзя удалить собственную учётную запись');
  const user = await findUserOrFail(id);
  await user.destroy();
}

module.exports = { findUserOrFail, listUsers, changeUserRole, deleteUser };
