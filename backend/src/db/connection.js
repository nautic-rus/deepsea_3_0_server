/**
 * Подключение к базе данных PostgreSQL
 */

const { Pool } = require('pg');
const dbConfig = require('../config/database');
const cacheInvalidator = require('../utils/cacheInvalidator');

const pool = new Pool(dbConfig);

// Обработка ошибок подключения
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Wrap pool.query to emit cache invalidation on write queries (INSERT/UPDATE/DELETE)
const _origQuery = pool.query.bind(pool);
pool.query = async function (text, params, callback) {
  // Support pg's various call signatures by delegating directly
  const res = await _origQuery(text, params, callback).catch((err) => { throw err; });

  try {
    const q = (typeof text === 'string') ? text.trim() : (text && text.text ? String(text.text).trim() : '');
    if (q) {
      const up = q.toUpperCase();
      if (/^(INSERT|UPDATE|DELETE)\b/.test(up)) {
        // Try to extract table name (basic heuristics)
        const ins = up.match(/INSERT\s+INTO\s+([\w\.\"]+)/i);
        const upd = up.match(/UPDATE\s+([\w\.\"]+)/i);
        const del = up.match(/DELETE\s+FROM\s+([\w\.\"]+)/i);
        const m = ins || upd || del;
        if (m && m[1]) {
          const table = String(m[1]).replace(/\"/g, '').split('.').pop().toLowerCase();
          cacheInvalidator.invalidate(table, { sql: q });
        } else {
          // fallback: notify generic invalidation
          cacheInvalidator.invalidateAll({ sql: q });
        }
      }
    }
  } catch (e) {
    // ignore invalidation errors
  }

  return res;
};

module.exports = pool;




