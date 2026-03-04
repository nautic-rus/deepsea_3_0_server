/**
 * Простой скрипт проверки подключения к старой базе PostgreSQL
 * Использует конфиг: ../config/database.js
 *
 * Запуск:
 *  - установить зависимости: `npm install pg dotenv`
 *  - создать файл `.env` в той же папке (или в корне проекта) на основе `.env.example`
 *  - запустить: `node migratons_deepsea_2/scripts/check_old_db.js`
 */

require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const createLogger = require('../utils/logger');

const log = createLogger('check_old_db');

// Подключаем конфиг миграций (относительно этого файла)
const dbConfig = require(path.join(__dirname, '..', 'config', 'database.js'));

const pool = new Pool(dbConfig);

async function main() {
  try {
    const res = await pool.query('SELECT NOW()');
    log.info('Connected to old DB. Server time:', res.rows[0].now);
  } catch (err) {
    log.error('Connection error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch (_) {}
    log.close();
  }
}

main();
