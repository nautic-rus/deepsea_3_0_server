const pool = require('../connection');

class StatementsVersion {
  static async list(filters = {}) {
    const { statement_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (statement_id) { where.push(`statement_id = $${idx++}`); values.push(statement_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, statement_id, version, notes, created_by, created_at FROM statements_version ${whereSql} ORDER BY id DESC`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, statement_id, version, notes, created_by, created_at FROM statements_version WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO statements_version (statement_id, version, notes, created_by) VALUES ($1,$2,$3,$4) RETURNING id, statement_id, version, notes, created_by, created_at`;
    const vals = [fields.statement_id, fields.version || null, fields.notes || null, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['version','notes'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await StatementsVersion.findById(id);
    const q = `UPDATE statements_version SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, statement_id, version, notes, created_by, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE statements_version SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM statements_version WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = StatementsVersion;
