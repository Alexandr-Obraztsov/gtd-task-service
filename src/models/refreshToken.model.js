const { DataTypes, Model } = require('sequelize');

class RefreshToken extends Model {
  isActive(now = new Date()) {
    return !this.revokedAt && this.expiresAt > now;
  }
}

function initRefreshTokenModel(sequelize) {
  RefreshToken.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      replacedByHash: { type: DataTypes.STRING(64), allowNull: true },
      createdByIp: { type: DataTypes.STRING(64), allowNull: true },
    },
    { sequelize, modelName: 'RefreshToken', tableName: 'refresh_tokens', updatedAt: false },
  );
  return RefreshToken;
}

module.exports = { RefreshToken, initRefreshTokenModel };
