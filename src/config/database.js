const { Sequelize } = require('sequelize');
const config = require('./env');
const { logger } = require('../utils/logger');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: config.isProduction ? false : (sql) => logger.debug(sql),
  define: {
    underscored: false,
    freezeTableName: false,
  },
  pool: {
    max: 10,
    min: 0,
    idle: 10000,
  },
});

module.exports = sequelize;
