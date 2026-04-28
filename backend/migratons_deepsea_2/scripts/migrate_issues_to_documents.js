/**
 * Миграция: issue (старый DB) -> documents (новая БД)
 * Условия: issue_type IN ('PSD','PDSP','MSH','ITT','ED','RKD') AND removed = 0
 * Маппинг полей:
 *  - issue.issue_name -> documents.title
 *  - issue.doc_number -> documents.code (если колонка присутствует)
 *  - issue.status -> найти id по document_status.code -> documents.status_id
 *  - issue.project -> найти id по projects.code -> documents.project_id
 *  - issue.responsible -> найти id по users.login -> documents.created_by
 *  - issue.started_by -> найти id по users.login -> documents.assigne_to
 *  - issue.start_date -> ms -> documents.created_at
 *  - issue.issue_type -> найти id по document_type.code -> documents.type_id
 *  - старый issue.id сохраняется в documents.comment если колонка есть,
 *    иначе создаётся запись в documents_issue (document_id, issue_id)
 *
 * Также для каждого документа создаётся соответствующая задача в таблице issues (новой БД):
 *  - статусы ищем в issue_status по коду
 *  - типы ищем в issue_type по коду
 *  - issue.responsible -> issues.author_id
 *  - issue.assigned_to -> issues.assignee_id
 *
 * Запуск:
 *  - npm install pg dotenv
 *  - Отредактируйте параметры подключения ниже или задайте env vars:
 *      OLD_DB_*, NEW_DB_*
 *  - Запуск: node migratons_deepsea_2/scripts/migrate_issues_to_documents.js [--limit=NN]
 */

const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// Setup logging to file
const LOG_DIR = path.join(__dirname, '..', 'logs');
try { if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) { /* ignore */ }
const LOG_FILE = path.join(LOG_DIR, `migrate_issues_to_documents_${new Date().toISOString().replace(/[:.]/g,'-')}.log`);
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
const _origConsole = { info: console.info, warn: console.warn, error: console.error };
function _writeLog(level, ...args) {
  const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${msg}\n`;
  try { logStream.write(line); } catch (e) { /* ignore */ }
  _origConsole[level](...args);
}
console.info = (...a) => _writeLog('info', ...a);
console.warn = (...a) => _writeLog('warn', ...a);
console.error = (...a) => _writeLog('error', ...a);
process.on('exit', () => { try { logStream.end(); } catch (e) {} });

// Явные настройки подключения (как в других миграционных скриптах)
const oldPool = new Pool({
  host: process.env.OLD_DB_HOST || '192.168.1.26',
  port: process.env.OLD_DB_PORT ? Number(process.env.OLD_DB_PORT) : 5432,
  database: process.env.OLD_DB_NAME || 'deepsea',
  user: process.env.OLD_DB_USER || 'deepsea',
  password: process.env.OLD_DB_PASS || 'Ship123',
  ssl: false,
  max: 5,
});


const newPool = new Pool({
  host: process.env.NEW_DB_HOST || '89.108.98.183',
  port: process.env.NEW_DB_PORT ? Number(process.env.NEW_DB_PORT) : 5432,
  database: process.env.NEW_DB_NAME || 'deepsea3',
  user: process.env.NEW_DB_USER || 'postgres',
  password: process.env.NEW_DB_PASS || '230571Sp',
  ssl: false,
  max: 5,
});

const csvPath = path.join(__dirname, '..', 'migrated_issues_to_documents.csv');
const csvStream = fs.createWriteStream(csvPath, { flags: 'w' });
csvStream.write('old_issue_id,new_document_id,new_issue_task_id,issue_name\n');

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

function safeTrim(v) { if (v === null || v === undefined) return null; return String(v).trim(); }

async function hasColumn(table, column) {
  const q = `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`;
  const res = await newPool.query(q, [table, column]);
  return res.rowCount > 0;
}

async function findIdByCode(table, code) {
  if (!code) return null;
  const q = `SELECT id FROM ${table} WHERE LOWER(code) = LOWER($1) LIMIT 1`;
  try {
    const res = await newPool.query(q, [code]);
    return res.rowCount ? res.rows[0].id : null;
  } catch (e) {
    return null;
  }
}

async function findUserIdByLogin(login) {
  if (!login) return null;
  let res = await newPool.query('SELECT id FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1', [login]);
  if (res.rowCount) return res.rows[0].id;
  res = await newPool.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [login]);
  if (res.rowCount) return res.rows[0].id;
  res = await newPool.query('SELECT id FROM users WHERE LOWER(login)=LOWER($1) LIMIT 1', [login]);
  if (res.rowCount) return res.rows[0].id;
  return null;
}

async function findSpecializationIdByCode(code) {
  if (!code) return null;
  try {
    const res = await newPool.query('SELECT id FROM specializations WHERE LOWER(code) = LOWER($1) LIMIT 1', [code]);
    return res.rowCount ? res.rows[0].id : null;
  } catch (e) {
    return null;
  }
}

async function createUserIfNotExists(login) {
  if (!login) return null;
  // try existing lookups first
  const existing = await findUserIdByLogin(login).catch(()=>null);
  if (existing) return existing;
  // build safe values for required columns
  const base = String(login).replace(/[^a-z0-9_.@-]/gi, '_').slice(0, 90) || `migrated_user_${Date.now()}`;
  let username = base;
  let email = `${base.toLowerCase()}@migrated.local`;
  // ensure uniqueness by appending timestamp if needed
  try {
    const qChk = 'SELECT 1 FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($2) LIMIT 1';
    const chk = await newPool.query(qChk, [username, email]);
    if (chk.rowCount) {
      username = `${base}_${Date.now()}`.slice(0, 100);
      email = `${base.toLowerCase()}_${Date.now()}@migrated.local`;
    }
    const phone = `+000${String(Date.now()).slice(-9)}`;
    const password_hash = 'migrated';
    const qIns = `INSERT INTO users (username, email, phone, password_hash, first_name, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id`;
    const res = await newPool.query(qIns, [username, email, phone, password_hash, null]);
    if (res && res.rowCount) return res.rows[0].id;
  } catch (e) {
    const msg = e && e.message ? e.message.toLowerCase() : '';
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
      // someone else created concurrently, try to find again
      const retry = await findUserIdByLogin(login).catch(()=>null);
      if (retry) return retry;
    }
    console.warn(`createUserIfNotExists error for '${login}': ${e && e.message ? e.message : e}`);
  }
  return null;
}

async function createProjectIfNotExists(code) {
  if (!code) return null;
  const existing = await findIdByCode('projects', code).catch(()=>null);
  if (existing) return existing;
  try {
    const name = String(code).slice(0, 255) || `Project ${Date.now()}`;
    const qIns = `INSERT INTO projects (name, code, description, created_at, updated_at) VALUES ($1,$2,$3,NOW(),NOW()) RETURNING id`;
    const res = await newPool.query(qIns, [name, code, `Migrated project ${code}`]);
    if (res && res.rowCount) return res.rows[0].id;
  } catch (e) {
    const msg = e && e.message ? e.message.toLowerCase() : '';
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
      const retry = await findIdByCode('projects', code).catch(()=>null);
      if (retry) return retry;
    }
    console.warn(`createProjectIfNotExists error for '${code}': ${e && e.message ? e.message : e}`);
  }
  return null;
}

async function ensureDirectory(projectKey, deptKey, createdByFallback) {
  // projectKey -> parent directory (parent_id IS NULL)
  // deptKey -> child directory under parent
  if (!projectKey) return null;
  const createdBy = createdByFallback || 1;
  // find or create parent
  let parentId = null;
  try {
    const q1 = `SELECT id FROM document_directories WHERE LOWER(name) = LOWER($1) AND parent_id IS NULL LIMIT 1`;
    const r1 = await newPool.query(q1, [projectKey]);
    if (r1.rowCount) parentId = r1.rows[0].id;
    else {
      const pathVal = '/' + projectKey;
      const qIns = `INSERT INTO document_directories (name, path, parent_id, description, order_index, created_by, updated_by) VALUES ($1,$2,NULL,$3,0,$4,NULL) RETURNING id`;
      const rIns = await newPool.query(qIns, [projectKey, pathVal, `Project ${projectKey}`, createdBy]);
      if (rIns.rowCount) parentId = rIns.rows[0].id;
    }
  } catch (e) {
    console.warn(`Directory parent handling error for project='${projectKey}': ${e.message || e}`);
  }

  if (!deptKey) return parentId;

  // find or create child under parentId
  try {
    const q2 = `SELECT id FROM document_directories WHERE LOWER(name) = LOWER($1) AND parent_id = $2 LIMIT 1`;
    const r2 = await newPool.query(q2, [deptKey, parentId]);
    if (r2.rowCount) return r2.rows[0].id;
    const childPath = parentId ? `/${projectKey}/${deptKey}` : `/${projectKey}/${deptKey}`;
    const qIns2 = `INSERT INTO document_directories (name, path, parent_id, description, order_index, created_by, updated_by) VALUES ($1,$2,$3,$4,0,$5,NULL) RETURNING id`;
    const rIns2 = await newPool.query(qIns2, [deptKey, childPath, parentId, `Department ${deptKey}`, createdBy]);
    if (rIns2.rowCount) return rIns2.rows[0].id;
  } catch (e) {
    console.warn(`Directory child handling error for project='${projectKey}', dept='${deptKey}': ${e.message || e}`);
  }
  return parentId;
}

async function createEntityLink(activeType, activeId, passiveType, passiveId, createdBy) {
  if (!activeType || !activeId || !passiveType || !passiveId) return null;
  // Try insert using active/passive column names first; fall back to source/target if needed
  const payloads = [
    { sql: 'INSERT INTO entity_links (active_type, active_id, passive_type, passive_id, relation_type, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', vals: [activeType, activeId, passiveType, passiveId, 'relates', createdBy] },
    { sql: 'INSERT INTO entity_links (source_type, source_id, target_type, target_id, relation_type, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', vals: [activeType, activeId, passiveType, passiveId, 'relates', createdBy] }
  ];
  for (const p of payloads) {
    try {
      const res = await newPool.query(p.sql, p.vals);
      if (res && res.rowCount) return res.rows[0].id;
    } catch (e) {
      // ignore unique/duplicate errors and schema mismatch and try next
      const msg = (e && e.message) ? e.message.toLowerCase() : '';
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists') || msg.includes('entity_links_source_type')) {
        return null;
      }
      // if column does not exist try next payload, otherwise log and continue
      if (msg.includes('column') && msg.includes('does not exist')) continue;
      // other errors: log and continue
      console.warn('EntityLink insert error:', e && e.message ? e.message : e);
    }
  }
  return null;
}

async function migrate() {
  console.info('Starting migration: issue -> documents');

  const hasComment = await hasColumn('documents', 'comment');
  const hasCode = await hasColumn('documents', 'code');
  const hasResponsibleCol = await hasColumn('documents', 'responsible_id');
  const hasIssuesComment = await hasColumn('issues', 'comment');

  const selectQ = `SELECT id, issue_name, doc_number, status, project, responsible, started_by, start_date, issue_type, assigned_to, removed, details, department
    FROM issue WHERE removed = 0 AND issue_type = ANY($1::text[])`;
  const types = ['PSD','PDSP','MSH','ITT','ED','RKD'];

  const { rows } = await oldPool.query(selectQ, [types]);
  console.info(`Found ${rows.length} issues matching types and removed=0`);

  let processed = 0, createdDocs = 0, createdTasks = 0, skipped = 0;
  for (const r of rows) {
    processed++;
    if (maxImport && processed > maxImport) { console.info(`Reached limit ${maxImport}`); break; }
    const oldId = r.id;
    const title = safeTrim(r.issue_name) || null;
    const titleUp = title ? title.toUpperCase() : null;
    const codeVal = safeTrim(r.doc_number) || null;
    const statusKey = safeTrim(r.status) || null;
    const projectKey = safeTrim(r.project) || null;
    const responsibleLogin = safeTrim(r.responsible) || null;
    const startedByLogin = safeTrim(r.started_by) || null;
    const assignedToLogin = safeTrim(r.assigned_to) || null;
    const issueTypeKey = safeTrim(r.issue_type) || null;
    const details = safeTrim(r.details) || null;

    // Check duplicate by documents.comment or documents_issue
    let already = false;
    try {
      if (hasComment) {
        const dup = await newPool.query('SELECT id FROM documents WHERE comment = $1 LIMIT 1', [String(oldId)]);
        if (dup.rowCount) { already = true; }
      } else {
        const dup2 = await newPool.query('SELECT di.id FROM documents_issue di WHERE di.issue_id = $1 LIMIT 1', [oldId]);
        if (dup2.rowCount) { already = true; }
      }
    } catch (e) {
      console.warn(`Dup-check error for ${oldId}: ${e.message || e}`);
    }
    if (already) { skipped++; continue; }

    // Lookups
    const statusId = await findIdByCode('document_status', statusKey).catch(()=>null);
    let projectId = await findIdByCode('projects', projectKey).catch(()=>null);
    if (!projectId && projectKey) {
      projectId = await createProjectIfNotExists(projectKey).catch(()=>null);
      if (projectId) console.info(`Created project '${projectKey}' -> id=${projectId}`);
    }
    const typeId = await findIdByCode('document_type', issueTypeKey).catch(()=>null);
    // Map users: started_by -> documents.created_by, responsible -> documents.responsible_id
    let responsibleId = await findUserIdByLogin(responsibleLogin).catch(()=>null);
    if (!responsibleId && responsibleLogin) {
      responsibleId = await createUserIfNotExists(responsibleLogin).catch(()=>null);
      if (responsibleId) console.info(`Created user for responsible='${responsibleLogin}' -> id=${responsibleId}`);
    }
    let createdBy = await findUserIdByLogin(startedByLogin).catch(()=>null);
    if (!createdBy && startedByLogin) {
      createdBy = await createUserIfNotExists(startedByLogin).catch(()=>null);
      if (createdBy) console.info(`Created user for started_by='${startedByLogin}' -> id=${createdBy}`);
    }
    let assigneTo = await findUserIdByLogin(assignedToLogin).catch(()=>null);
    if (!assigneTo && assignedToLogin) {
      assigneTo = await createUserIfNotExists(assignedToLogin).catch(()=>null);
      if (assigneTo) console.info(`Created user for assigned_to='${assignedToLogin}' -> id=${assigneTo}`);
    }
    // default to system user id = 1 when user still not found or creation failed
    if (!responsibleId) responsibleId = 1;
    if (!createdBy) createdBy = 1;
    if (!assigneTo) assigneTo = 1;
    const specializationId = await findSpecializationIdByCode(safeTrim(r.department) || safeTrim(r.deparment) || null).catch(()=>null);

    // ensure directories (project -> department)
    let directoryId = null;
    try {
      const deptKey = safeTrim(r.department) || null;
      directoryId = await ensureDirectory(projectKey, deptKey, createdBy || 1);
    } catch (e) {
      console.warn(`Failed to ensure directory for old issue ${oldId}: ${e.message || e}`);
    }

    // convert start_date (ms) to JS date if present
    let createdAt = null;
    if (r.start_date !== null && r.start_date !== undefined && String(r.start_date).trim() !== '') {
      let n = Number(r.start_date);
      if (!Number.isNaN(n)) {
        if (n < 1e11) n = n * 1000; // seconds -> ms
        createdAt = new Date(n);
      }
    }

    // Build insert
    const insertCols = [];
    const insertVals = [];
    const placeholders = [];
    let idx = 1;
    if (title) { insertCols.push('title'); insertVals.push(titleUp); placeholders.push(`$${idx++}`); }
    if (hasCode && codeVal) { insertCols.push('code'); insertVals.push(codeVal); placeholders.push(`$${idx++}`); }
    if (projectId) { insertCols.push('project_id'); insertVals.push(projectId); placeholders.push(`$${idx++}`); }
    if (typeId) { insertCols.push('type_id'); insertVals.push(typeId); placeholders.push(`$${idx++}`); }
    if (statusId) { insertCols.push('status_id'); insertVals.push(statusId); placeholders.push(`$${idx++}`); }
    if (specializationId) { insertCols.push('specialization_id'); insertVals.push(specializationId); placeholders.push(`$${idx++}`); }
    if (directoryId) { insertCols.push('directory_id'); insertVals.push(directoryId); placeholders.push(`$${idx++}`); }
    if (hasResponsibleCol && responsibleId) { insertCols.push('responsible_id'); insertVals.push(responsibleId); placeholders.push(`$${idx++}`); }
    if (createdBy) { insertCols.push('created_by'); insertVals.push(createdBy); placeholders.push(`$${idx++}`); }
    if (assigneTo) { insertCols.push('assigne_to'); insertVals.push(assigneTo); placeholders.push(`$${idx++}`); }
    if (details) { insertCols.push('description'); insertVals.push(details); placeholders.push(`$${idx++}`); }
    if (createdAt) { insertCols.push('created_at'); insertVals.push(createdAt); placeholders.push(`$${idx++}`); }
    if (hasComment) { insertCols.push('comment'); insertVals.push(String(oldId)); placeholders.push(`$${idx++}`); }

    let newDocId = null;
    try {
      if (insertCols.length === 0) {
        console.warn(`No insertable fields for old issue ${oldId}, skipping`);
        skipped++; continue;
      }
      const q = `INSERT INTO documents (${insertCols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`;
      const resIns = await newPool.query(q, insertVals);
      if (resIns.rowCount) newDocId = resIns.rows[0].id;
      if (!newDocId) {
        console.warn(`Insert returned no id for old issue ${oldId}`);
        skipped++; continue;
      }
      createdDocs++;
    } catch (e) {
      console.error(`Failed to insert document for old issue ${oldId}: ${e.message || e}`);
      skipped++; continue;
    }

    // If we didn't have comment column, create link in documents_issue
    if (!hasComment && newDocId) {
      try {
        await newPool.query('INSERT INTO documents_issue (document_id, issue_id) VALUES ($1, $2)', [newDocId, oldId]);
      } catch (e) {
        console.warn(`Failed to insert documents_issue link for ${oldId} -> ${newDocId}: ${e.message || e}`);
      }
    }

    // Create corresponding task in issues table (new DB)
    let newTaskId = null;
    try {
      const issueStatusId = await findIdByCode('issue_status', statusKey).catch(()=>null);
      // Force migrated issues to type_id = 6
      const issueTypeId = 6;
      let authorId = await findUserIdByLogin(responsibleLogin).catch(()=>null);
      if (!authorId && responsibleLogin) {
        authorId = await createUserIfNotExists(responsibleLogin).catch(()=>null);
        if (authorId) console.info(`Created user for issue author='${responsibleLogin}' -> id=${authorId}`);
      }
      let assigneeId = await findUserIdByLogin(assignedToLogin).catch(()=>null);
      if (!assigneeId && assignedToLogin) {
        assigneeId = await createUserIfNotExists(assignedToLogin).catch(()=>null);
        if (assigneeId) console.info(`Created user for issue assignee='${assignedToLogin}' -> id=${assigneeId}`);
      }
      if (!authorId) authorId = 1;
      if (!assigneeId) assigneeId = 1;

      const taskCols = ['title','project_id'];
      const taskVals = [titleUp || ('Issue-'+String(oldId)).toUpperCase(), projectId || null];
      const taskPlace = ['$1', '$2'];
      let tIdx = 3;
      if (issueStatusId) { taskCols.push('status_id'); taskVals.push(issueStatusId); taskPlace.push(`$${tIdx++}`); }
      if (issueTypeId) { taskCols.push('type_id'); taskVals.push(issueTypeId); taskPlace.push(`$${tIdx++}`); }
      if (authorId) { taskCols.push('author_id'); taskVals.push(authorId); taskPlace.push(`$${tIdx++}`); }
      if (assigneeId) { taskCols.push('assignee_id'); taskVals.push(assigneeId); taskPlace.push(`$${tIdx++}`); }
      if (details) { taskCols.push('description'); taskVals.push(details); taskPlace.push(`$${tIdx++}`); }
      if (createdAt) { taskCols.push('created_at'); taskVals.push(createdAt); taskPlace.push(`$${tIdx++}`); }
      // store original issue id in issues.comment if column exists
      if (hasIssuesComment) { taskCols.push('comment'); taskVals.push(String(oldId)); taskPlace.push(`$${tIdx++}`); }

      if (hasIssuesComment) {
        // if an issue with this comment exists, update it instead of inserting
        try {
          const existsQ = 'SELECT id FROM issues WHERE comment = $1 LIMIT 1';
          const exRes = await newPool.query(existsQ, [String(oldId)]);
          if (exRes.rowCount) {
            const existingId = exRes.rows[0].id;
            // build update statement from taskCols/taskVals
            const updParts = [];
            const updVals = [];
            for (let i = 0; i < taskCols.length; i++) {
              updParts.push(`${taskCols[i]} = $${i+1}`);
              updVals.push(taskVals[i]);
            }
            updVals.push(existingId);
            const qUpd = `UPDATE issues SET ${updParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${updVals.length} RETURNING id`;
            const uRes = await newPool.query(qUpd, updVals);
            if (uRes.rowCount) newTaskId = uRes.rows[0].id;
            if (newTaskId) createdTasks++;
          } else {
            const qTask = `INSERT INTO issues (${taskCols.join(',')}) VALUES (${taskPlace.join(',')}) RETURNING id`;
            const taskRes = await newPool.query(qTask, taskVals);
            if (taskRes.rowCount) newTaskId = taskRes.rows[0].id;
            if (newTaskId) createdTasks++;
          }
        } catch (e) {
          console.warn(`Issue upsert error for old issue ${oldId}: ${e.message || e}`);
        }
      } else {
        const qTask = `INSERT INTO issues (${taskCols.join(',')}) VALUES (${taskPlace.join(',')}) RETURNING id`;
        const taskRes = await newPool.query(qTask, taskVals);
        if (taskRes.rowCount) newTaskId = taskRes.rows[0].id;
        if (newTaskId) createdTasks++;
      }
    } catch (e) {
      console.warn(`Failed to create linked task for old issue ${oldId}: ${e.message || e}`);
    }

    // create entity link: issue -> document (relates)
    try {
      if (newTaskId && newDocId) await createEntityLink('issue', newTaskId, 'document', newDocId, createdBy);
    } catch (e) {
      console.warn(`Failed to create entity_link for old issue ${oldId}: ${e.message || e}`);
    }

    csvStream.write(`${oldId},${newDocId || ''},${newTaskId || ''},"${(title||'').replace(/"/g,'""')}"\n`);
  }

  console.info(`Processed ${processed}, created documents ${createdDocs}, created tasks ${createdTasks}, skipped ${skipped}`);
  csvStream.end();
  await oldPool.end();
  await newPool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err && err.message ? err.message : err);
  process.exit(2);
});
