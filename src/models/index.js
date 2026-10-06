const sequelize = require('../config/database');
const { User, initUserModel } = require('./user.model');
const { RefreshToken, initRefreshTokenModel } = require('./refreshToken.model');
const { Context, initContextModel } = require('./context.model');
const { Task, initTaskModel } = require('./task.model');

initUserModel(sequelize);
initRefreshTokenModel(sequelize);
initContextModel(sequelize);
initTaskModel(sequelize);

const CASCADE = { onDelete: 'CASCADE' };

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', ...CASCADE });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Context, { foreignKey: 'ownerId', as: 'contexts', ...CASCADE });
Context.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Task, { foreignKey: 'ownerId', as: 'tasks', ...CASCADE });
Task.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Context.hasMany(Task, { foreignKey: 'contextId', as: 'tasks', onDelete: 'SET NULL' });
Task.belongsTo(Context, { foreignKey: 'contextId', as: 'context' });

module.exports = { sequelize, User, RefreshToken, Context, Task };
