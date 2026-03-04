/**
 * Скрипт миграции пользователей из old DB → new DB
 *
 * Использует два явных pg.Pool (old + new) с хардкод-конфигом.
 * Не зависит от моделей проекта (src/db/*).
 *
 * Поведение:
 *  - читает: login, name, surname, email, phone, rocket_login, removed
 *  - проверка по email — если уже есть в новой БД, пропускает
 *  - login → username, name → first_name, surname → last_name
 *  - removed → is_active (removed = true ⇒ is_active = false)
 *  - rocket_login → user_rocket_chat.rc_username
 *
 * Запуск:
 *  - npm install pg
 *  - node migratons_deepsea_2/scripts/migrate_users.js
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const createLogger = require('../utils/logger');

const log = createLogger('migrate_users');

const BCRYPT_ROUNDS = 10;

/**
 * Генерирует случайный пароль длиной 12 символов (буквы + цифры + спецсимволы).
 */
function generatePassword(len = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const buf = crypto.randomBytes(len);
  let pw = '';
  for (let i = 0; i < len; i++) {
    pw += chars[buf[i] % chars.length];
  }
  return pw;
}

// CSV-файл для сохранения сгенерированных паролей
const csvPath = path.join(__dirname, '..', 'migrated_users_passwords.csv');
const csvStream = fs.createWriteStream(csvPath, { flags: 'w' });
csvStream.write('email,username,password\n');

// ─── Конфиг: старая БД (откуда читаем) ────────────────────────────
const oldPool = new Pool({
  host: '192.168.1.26',
  port: 5432,
  database: 'deepsea',
  user: 'deepsea',
  password: 'Ship123',
  ssl: false,
  max: 5,
});

// ─── Конфиг: новая БД (куда пишем) ────────────────────────────────
const newPool = new Pool({
  host: '192.168.1.177',
  port: 5432,
  database: 'deepsea3',
  user: 'postgres',
  password: '230571Sp',
  ssl: false,
  max: 5,
});

// ─── Утилиты ──────────────────────────────────────────────────────
function parseRemoved(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string')
    return val === '1' || val.toLowerCase() === 't' || val.toLowerCase() === 'true';
  return false;
}

// ─── Основная функция ─────────────────────────────────────────────
async function migrate() {
  log.info('Starting users migration...');
  let readCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  try {
    // 1. Читаем пользователей из старой БД
    const selectQuery = `
      SELECT login, name, surname, email, phone, rocket_login, removed
      FROM users`;
    const { rows } = await oldPool.query(selectQuery);
    readCount = rows.length;
    log.info(`Found ${readCount} rows in old DB`);

    for (const row of rows) {
      const email = row.email && row.email.trim();
      if (!email) {
        log.warn('Skipping user with no email:', row.login || '<no-login>');
        skippedCount++;
        continue;
      }

      // 2. Проверяем дубликат по email в новой БД
      const dup = await newPool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (dup.rowCount > 0) {
        skippedCount++;
        log.info(`Skip (exists): ${email}`);
        continue;
      }

      // 3. Вставляем пользователя в новую БД
      const username   = row.login || email.split('@')[0];
      const firstName  = row.name || null;
      const lastName   = row.surname || null;
      const phone      = row.phone || null;
      const isActive   = !parseRemoved(row.removed);

      const insertUser = `
        INSERT INTO users (username, email, phone, password_hash, first_name, last_name, is_active, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false)
        RETURNING id`;

      try {
        // Генерируем уникальный пароль и хешируем
        const plainPassword = generatePassword();
        const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

        const ins = await newPool.query(insertUser, [
          username, email, phone, passwordHash, firstName, lastName, isActive,
        ]);
        const newId = ins.rows[0].id;
        createdCount++;

        // Сохраняем пароль в CSV
        csvStream.write(`${email},${username},${plainPassword}\n`);
        log.info(`Created user id=${newId} email=${email}`);

        // 4. Rocket.Chat mapping
        const rc = row.rocket_login && String(row.rocket_login).trim();
        if (rc) {
          try {
            const rcDup = await newPool.query(
              'SELECT id FROM user_rocket_chat WHERE rc_username = $1', [rc]);
            if (rcDup.rowCount > 0) {
              log.warn(`RC username already mapped: ${rc} (skip for user id=${newId})`);
            } else {
              await newPool.query(
                'INSERT INTO user_rocket_chat (user_id, rc_username) VALUES ($1, $2)',
                [newId, rc]);
              log.info(`  ↳ Mapped RC: ${rc}`);
            }
          } catch (errRc) {
            log.error(`  ↳ RC mapping error for ${email}:`, errRc.message || errRc);
          }
        }
      } catch (err) {
        log.error(`Error creating user ${email}:`, err.message || err);
      }
    }

    log.info(`Migration finished. Read=${readCount} Created=${createdCount} Skipped=${skippedCount}`);
    if (createdCount > 0) {
      log.info(`Passwords saved to: ${csvPath}`);
    }
    log.info(`Log file: ${log.logFile}`);
  } catch (err) {
    log.error('Migration error:', err.message || err);
    process.exitCode = 1;
  } finally {
    csvStream.end();
    log.close();
    await oldPool.end().catch(() => {});
    await newPool.end().catch(() => {});
  }
}

migrate();
