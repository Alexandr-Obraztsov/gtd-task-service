const { DataTypes, Model } = require('sequelize');
const { ROLES, ROLE_VALUES } = require('../utils/roles');

const PUBLIC_FIELDS = Object.freeze(['id', 'email', 'role', 'createdAt', 'updatedAt']);

class User extends Model {
  isLocked(now = new Date()) {
    return Boolean(this.lockUntil && this.lockUntil > now);
  }

  toJSON() {
    const values = this.get({ plain: true });
    return Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, values[field]]));
  }
}

function initUserModel(sequelize) {
  User.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: { type: DataTypes.STRING(100), allowNull: false },
      role: {
        type: DataTypes.ENUM(...ROLE_VALUES),
        allowNull: false,
        defaultValue: ROLES.USER,
      },
      failedAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lockUntil: { type: DataTypes.DATE, allowNull: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'User', tableName: 'users' },
  );
  return User;
}

module.exports = { User, initUserModel };
