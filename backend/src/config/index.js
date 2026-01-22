/**
 * Главный конфигурационный файл
 */

const database = require('./database');

module.exports = {
  database,
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
};




