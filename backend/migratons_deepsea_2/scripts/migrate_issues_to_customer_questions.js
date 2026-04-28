/**
 * Миграция: issue (old DB) -> customer_questions (new DB)
 * Условия: issue_type = 'QNA' AND removed = 0
 * Маппинг полей:
 *  - issue.issue_name       -> customer_questions.question_title
 *  - issue.details          -> customer_questions.question_text
 *  - issue.status           -> find id by customer_question_status.code -> customer_questions.status_id
 *  - issue.project          -> find id by projects.code -> customer_questions.project_id
 *  - issue.started_by       -> find id by users.username/login -> customer_questions.asked_by
 *  - issue.assigned_to      -> find id by users.username/login -> customer_questions.answered_by
 *  - customer_questions.type_id = 1
 *
 * Запуск:
 *  - заполните `migratons_deepsea_2/.env` (старый DB) и окружение на новую БД (DB_HOST, DB_NAME, ...)
 *  - npm install pg dotenv
 *  - node migratons_deepsea_2/scripts/migrate_issues_to_customer_questions.js
 */

const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');
const createLogger = require('../utils/logger');
const log = createLogger('migrate_issues_to_customer_questions');

// Явные настройки подключения (как в других миграционных скриптах)
const oldPool = new Pool({
  host: '192.168.1.26',
  port: 5432,
  database: 'deepsea',
  user: 'deepsea',
  password: 'Ship123',
  ssl: false,
  max: 5,
});

const newPool = new Pool({
  host: '89.108.98.183',
  port: 5432,
  database: 'deepsea3',
  user: 'postgres',
  password: '230571Sp',
  ssl: false,
  max: 5,
});

const csvPath = path.join(__dirname, '..', 'migrated_issues_to_customer_questions.csv');
const csvStream = fs.createWriteStream(csvPath, { flags: 'w' });
csvStream.write('old_issue_id,new_customer_question_id,issue_name\n');

// Максимальное количество записей для иморта: можно задать через --limit=NN или env MIGRATE_MAX
function parseLimitArg() {
  const arg = process.argv.find(a => a && a.startsWith('--limit='));
  if (arg) {
    const n = Number(arg.split('=')[1]);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  if (process.env.MIGRATE_MAX) {
    const m = Number(process.env.MIGRATE_MAX);
    if (!Number.isNaN(m) && m > 0) return m;
  }
  return null;
}
const maxImport = parseLimitArg();

function safeTrim(val) {
  if (val === null || val === undefined) return null;
  return String(val).trim();
}

async function findStatusId(code) {
  if (!code) return null;
  const res = await newPool.query(
    'SELECT id FROM customer_question_status WHERE LOWER(code) = LOWER($1) LIMIT 1',
    [code]
  );
  return res.rowCount > 0 ? res.rows[0].id : null;
}

async function findProjectId(code) {
  if (!code) return null;
  const res = await newPool.query(
    'SELECT id FROM projects WHERE LOWER(code) = LOWER($1) LIMIT 1',
    [code]
  );
  return res.rowCount > 0 ? res.rows[0].id : null;
}

async function findSpecializationId(code) {
  if (!code) return null;
  const res = await newPool.query(
    'SELECT id FROM specializations WHERE LOWER(code) = LOWER($1) LIMIT 1',
    [code]
  );
  return res.rowCount > 0 ? res.rows[0].id : null;
}

async function findUserIdByLogin(login) {
  if (!login) return null;
  // Try username first, then email as fallback
  let res = await newPool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [login]);
  if (res.rowCount > 0) return res.rows[0].id;
  res = await newPool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [login]);
  if (res.rowCount > 0) return res.rows[0].id;
  // try login column if present
  res = await newPool.query("SELECT id FROM users WHERE LOWER(login) = LOWER($1) LIMIT 1", [login]);
  if (res.rowCount > 0) return res.rows[0].id;
  return null;
}

async function migrate() {
  log.info('Starting issues -> customer_questions migration...');
  let readCount = 0, createdCount = 0, skippedCount = 0, updatedCount = 0;

  try {
    const selectQuery = `
      SELECT id, issue_name, details, status, project, started_by, assigned_to, started_date, department
      FROM issue
      WHERE issue_type = 'QNA' AND removed = 0
    `;

    const { rows } = await oldPool.query(selectQuery);
    readCount = rows.length;
    log.info(`Found ${readCount} QNA issues (removed=0)`);
    let processed = 0;
    for (const row of rows) {
      processed++;
      if (maxImport && processed > maxImport) {
        log.info(`Processed limit reached: ${maxImport}. Stopping.`);
        break;
      }
      const oldId = row.id;
      const title = safeTrim(row.issue_name) || null;
      const text = safeTrim(row.details) || null;
      const statusKey = safeTrim(row.status) || null;
      const projectKey = safeTrim(row.project) || null;
      const startedBy = safeTrim(row.started_by) || null;
      const assignedTo = safeTrim(row.assigned_to) || null;
      // started_date expected in milliseconds; convert to JS Date for PostgreSQL timestamp
      const startedDateRaw = row.started_date;
      let createdAt = null;
      if (startedDateRaw !== null && startedDateRaw !== undefined && String(startedDateRaw).trim() !== '') {
        let n = Number(startedDateRaw);
        if (!Number.isNaN(n)) {
          // Accept seconds (10 digits) or milliseconds (13+ digits)
          if (n > 0 && n < 1e11) {
            // likely seconds
            n = n * 1000;
          }
          if (n > 0) createdAt = new Date(n);
        }
      }

      if (!title && !text) {
        log.warn(`Skipping issue id=${oldId} (no title/text)`);
        skippedCount++;
        continue;
      }

      // проверяем наличие записи в новой БД по полю comment (старый issue.id)
      let existingId = null;
      try {
        const dupRes = await newPool.query('SELECT id FROM customer_questions WHERE comment = $1 LIMIT 1', [String(oldId)]);
        if (dupRes.rowCount > 0) existingId = dupRes.rows[0].id;
      } catch (errDup) {
        log.warn(`Dup-check error for issue ${oldId}: ${errDup.message || errDup}`);
      }

      // lookups
      let statusId = null;
      let projectId = null;
      let specializationId = null;
      let askedBy = null;
      let answeredBy = null;

      try {
        statusId = await findStatusId(statusKey);
      } catch (err) {
        log.warn(`Status lookup error for issue ${oldId} code='${statusKey}': ${err.message || err}`);
      }

      try {
        projectId = await findProjectId(projectKey);
      } catch (err) {
        log.warn(`Project lookup error for issue ${oldId} code='${projectKey}': ${err.message || err}`);
      }

      try {
        const deptKey = safeTrim(row.department) || null;
        specializationId = await findSpecializationId(deptKey);
      } catch (err) {
        log.warn(`Specialization lookup error for issue ${oldId} dept='${safeTrim(row.department)}': ${err.message || err}`);
      }

      try {
        askedBy = await findUserIdByLogin(startedBy);
      } catch (err) {
        log.warn(`Asked_by lookup error for issue ${oldId} login='${startedBy}': ${err.message || err}`);
      }

      try {
        answeredBy = await findUserIdByLogin(assignedTo);
      } catch (err) {
        log.warn(`Assigned_to lookup error for issue ${oldId} login='${assignedTo}': ${err.message || err}`);
      }

      const insertQuery = `
        INSERT INTO customer_questions
          (question_title, question_text, answer_text, status_id, project_id, asked_by, answered_by, specialization_id, comment, created_at, type_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id
      `;

      let answerText = null;
      try {
        const msgRes = await oldPool.query(
          `SELECT content FROM issue_messages WHERE issue_id = $1 AND prefix = $2 ORDER BY date DESC LIMIT 1`,
          [oldId, 'answer']
        );
        if (msgRes.rowCount > 0) answerText = safeTrim(msgRes.rows[0].content) || null;
      } catch (errMsg) {
        log.warn(`Issue ${oldId}: error fetching answer message: ${errMsg.message || errMsg}`);
      }

      try {
        // Debug log if important lookups are missing
        if (!specializationId) log.info(`Issue ${oldId}: specialization not found (dept='${safeTrim(row.department)}')`);
        if (!createdAt && startedDateRaw) log.info(`Issue ${oldId}: started_date present but could not parse ('${startedDateRaw}')`);
        if (!answerText) log.info(`Issue ${oldId}: no answer message found`);

        if (existingId) {
          const updateQuery = `
            UPDATE customer_questions SET
              question_title = $1,
              question_text = $2,
              answer_text = $3,
              status_id = $4,
              project_id = $5,
              asked_by = $6,
              answered_by = $7,
              specialization_id = $8,
              created_at = COALESCE($9, created_at),
              type_id = $10,
              updated_at = now()
            WHERE id = $11
            RETURNING id
          `;
          const up = await newPool.query(updateQuery, [
            title, text, answerText, statusId, projectId, askedBy, answeredBy, specializationId, createdAt, 1, existingId
          ]);
          const newId = up.rows[0].id;
          updatedCount++;
          csvStream.write(`${oldId},${newId},UPDATED,"${(title||'').replace(/"/g,'""')}"\n`);
          log.info(`Updated customer_question ${newId} from issue ${oldId}`);
        } else {
          const ins = await newPool.query(insertQuery, [
            title, text, answerText, statusId, projectId, askedBy, answeredBy, specializationId, String(oldId), createdAt, 1
          ]);
          const newId = ins.rows[0].id;
          createdCount++;
          csvStream.write(`${oldId},${newId},"${(title||'').replace(/"/g,'""')}"\n`);
          log.info(`Migrated issue ${oldId} -> customer_question ${newId}`);
        }
      } catch (errIns) {
        skippedCount++;
        log.error(`Error inserting customer_question for issue ${oldId}:`, errIns.message || errIns);
      }

      // обработка лимита вынесена в начало цикла (processed count)
    }

    log.info(`Finished. Read=${readCount} Created=${createdCount} Skipped=${skippedCount}`);
    if (createdCount > 0) log.info(`CSV: ${csvPath}`);
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
