/**
 * Главный конфигурационный файл
 */

const database = require('./database');

module.exports = {
  database,
  port: process.env.PORT ,
  host: process.env.HOST ,
  env: process.env.NODE_ENV,
};




