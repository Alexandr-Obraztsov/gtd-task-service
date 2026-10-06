const { DataTypes, Model } = require('sequelize');

class Context extends Model {}

function initContextModel(sequelize) {
  Context.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      ownerId: { type: DataTypes.INTEGER, allowNull: false },
      isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'Context',
      tableName: 'contexts',
      indexes: [{ unique: true, fields: ['ownerId', 'name'] }, { fields: ['isPublic'] }],
    },
  );
  return Context;
}

module.exports = { Context, initContextModel };
