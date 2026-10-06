const ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

const ROLE_RANK = Object.freeze({
  [ROLES.USER]: 1,
  [ROLES.MODERATOR]: 2,
  [ROLES.ADMIN]: 3,
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

function hasRole(actualRole, requiredRole) {
  return (ROLE_RANK[actualRole] || 0) >= ROLE_RANK[requiredRole];
}

module.exports = { ROLES, ROLE_VALUES, hasRole };
