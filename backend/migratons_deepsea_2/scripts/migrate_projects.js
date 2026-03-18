/**
 * Скрипт миграции проектов из old DB → new DB
 *
 * Использует два явных pg.Pool (old + new) с хардкод-конфигом.
 * Поведение:
 *  - читает: name, factory, status из issue_projects
 *  - переносит только записи с status = 0
 *  - сопоставление: issue_projects.name -> projects.code
 *                   issue_projects.factory -> projects.name
 *  - если в новой БД уже есть проект с таким code — пропускает
 *
 * Запуск:
 *  - npm install pg
 *  - node migratons_deepsea_2/scripts/migrate_projects.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const createLogger = require('../utils/logger');

const log = createLogger('migrate_projects');

// CSV-файл для сохранения мигрированных проектов (code,name)
const csvPath = path.join(__dirname, '..', 'migrated_projects.csv');
const csvStream = fs.createWriteStream(csvPath, { flags: 'w' });
csvStream.write('code,name\n');

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

async function migrate() {
  log.info('Starting projects migration...');
  let readCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  try {
    const selectQuery = `
      SELECT name, factory, status
      FROM issue_projects
      WHERE status = 0`;

    const { rows } = await oldPool.query(selectQuery);
    readCount = rows.length;
    log.info(`Found ${readCount} rows in old DB (status=0)`);

    for (const row of rows) {
      const codeRaw = row.name && String(row.name).trim();
      if (!codeRaw) {
        log.warn('Skipping project with empty name/code');
        skippedCount++;
        continue;
      }

      const code = codeRaw;
      const projName = row.factory && String(row.factory).trim() ? String(row.factory).trim() : code;

      // Проверяем дубликат по code в новой БД
      const dup = await newPool.query('SELECT id FROM projects WHERE code = $1', [code]);
      if (dup.rowCount > 0) {
        skippedCount++;
        log.info(`Skip (exists): code=${code}`);
        continue;
      }

      const insertProject = `
        INSERT INTO projects (code, name)
        VALUES ($1, $2)
        RETURNING id`;

      try {
        const ins = await newPool.query(insertProject, [code, projName]);
        const newId = ins.rows[0].id;
        createdCount++;
        csvStream.write(`${code.replace(/\n/g,' ')} , ${projName.replace(/\n/g,' ')}\n`);
        log.info(`Created project id=${newId} code=${code} name=${projName}`);
      } catch (errIns) {
        skippedCount++;
        log.error(`Error creating project code=${code}:`, errIns.message || errIns);
      }
    }

    log.info(`Migration finished. Read=${readCount} Created=${createdCount} Skipped=${skippedCount}`);
    if (createdCount > 0) log.info(`CSV saved to: ${csvPath}`);
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
