/**
 * Главный конфигурационный файл
 */

const database = require('./database');

module.exports = {
  database,
  get port() {
    return process.env.PORT;
  },
  get host() {
    return process.env.HOST;
  },
  get env() {
    return process.env.NODE_ENV;
  }
};




