const { ROLES, hasRole } = require('../utils/roles');
const { ForbiddenError, NotFoundError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspicious } = require('../utils/securityEvents');

const ACTIONS = Object.freeze({
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
});

const PRIVILEGED_ROLE_BY_ACTION = Object.freeze({
  [ACTIONS.READ]: ROLES.MODERATOR,
  [ACTIONS.UPDATE]: null,
  [ACTIONS.DELETE]: ROLES.ADMIN,
});

function reportForeignAccess(actor, details) {
  reportSuspicious(SECURITY_EVENTS.FOREIGN_RESOURCE_ACCESS, { userId: actor.id, ip: actor.ip, ...details });
}

function isPrivileged(actor, action) {
  const privilegedRole = PRIVILEGED_ROLE_BY_ACTION[action];
  return Boolean(privilegedRole) && hasRole(actor.role, privilegedRole);
}

function ensureCanAccess(actor, resource, action, resourceType) {
  if (resource.ownerId === actor.id || isPrivileged(actor, action)) {
    return;
  }
  reportForeignAccess(actor, { resourceType, resourceId: resource.id, ownerId: resource.ownerId, action });
  throw new ForbiddenError('Нет доступа к чужому ресурсу', 'FOREIGN_RESOURCE');
}

function resolveOwnerScope(actor, requestedOwnerId, resourceType) {
  if (isPrivileged(actor, ACTIONS.READ)) {
    return requestedOwnerId;
  }
  if (requestedOwnerId !== undefined && requestedOwnerId !== actor.id) {
    reportForeignAccess(actor, { resourceType, ownerId: requestedOwnerId, action: 'list' });
    throw new ForbiddenError('Нет доступа к чужим ресурсам', 'FOREIGN_RESOURCE');
  }
  return actor.id;
}

async function loadAccessible(Model, id, actor, action, resourceType) {
  const resource = await Model.findByPk(id);
  if (!resource) {
    throw new NotFoundError(`Ресурс ${resourceType} с id=${id} не найден`);
  }
  ensureCanAccess(actor, resource, action, resourceType);
  return resource;
}

module.exports = { ACTIONS, ensureCanAccess, resolveOwnerScope, loadAccessible };
