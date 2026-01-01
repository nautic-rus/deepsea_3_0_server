/**
 * Подключение к базе данных PostgreSQL
 */

const { Pool } = require('pg');
const dbConfig = require('../config/database');

const pool = new Pool(dbConfig);

// Обработка ошибок подключения
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;




