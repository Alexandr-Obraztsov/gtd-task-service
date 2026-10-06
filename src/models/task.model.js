const { DataTypes, Model } = require('sequelize');
const { TASK_STATUS, TASK_STATUS_VALUES } = require('../utils/taskStatus');

class Task extends Model {}

function initTaskModel(sequelize) {
  Task.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      status: {
        type: DataTypes.ENUM(...TASK_STATUS_VALUES),
        allowNull: false,
        defaultValue: TASK_STATUS.INBOX,
      },
      dueDate: { type: DataTypes.DATE, allowNull: true },
      remindAt: { type: DataTypes.DATE, allowNull: true },
      contextId: { type: DataTypes.INTEGER, allowNull: true },
      ownerId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: 'Task',
      tableName: 'tasks',
      indexes: [{ fields: ['ownerId', 'status'] }, { fields: ['remindAt'] }],
    },
  );
  return Task;
}

module.exports = { Task, initTaskModel };
