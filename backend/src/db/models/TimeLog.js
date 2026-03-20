const pool = require('../connection');

class TimeLog {
  static async list(filters = {}) {
    const { id, issue_id, user_id, date, date_before, date_after, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (id !== undefined) { where.push(`id = $${idx++}`); values.push(id); }
    if (issue_id !== undefined) { where.push(`issue_id = $${idx++}`); values.push(issue_id); }
    if (user_id !== undefined) { where.push(`user_id = $${idx++}`); values.push(user_id); }
    if (date) { where.push(`date = $${idx++}`); values.push(date); }
    if (date_before) { where.push(`date <= $${idx++}`); values.push(date_before); }
    if (date_after) { where.push(`date >= $${idx++}`); values.push(date_after); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, issue_id, user_id, hours, date, description, created_at, updated_at FROM time_logs ${whereSql} ORDER BY id`;
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
    const q = `SELECT id, issue_id, user_id, hours, date, description, created_at, updated_at FROM time_logs WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO time_logs (issue_id, user_id, hours, date, description) VALUES ($1,$2,$3,$4,$5) RETURNING id, issue_id, user_id, hours, date, description, created_at, updated_at`;
    const vals = [fields.issue_id, fields.user_id, fields.hours, fields.date, fields.description];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['issue_id','user_id','hours','date','description'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await TimeLog.findById(id);
    const q = `UPDATE time_logs SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, issue_id, user_id, hours, date, description, created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const q = `DELETE FROM time_logs WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = TimeLog;
