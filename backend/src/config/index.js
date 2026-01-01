/**
 * Главный конфигурационный файл
 */

const database = require('./database');

module.exports = {
  database,
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
};




