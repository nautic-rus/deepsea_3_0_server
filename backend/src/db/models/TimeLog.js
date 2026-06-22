const pool = require('../connection');

class TimeLog {
  static userJsonSql(alias = 'u') {
    return `json_build_object(
      'id', ${alias}.id,
      'username', ${alias}.username,
      'first_name', ${alias}.first_name,
      'last_name', ${alias}.last_name,
      'middle_name', ${alias}.middle_name,
      'full_name', concat_ws(' ', ${alias}.last_name, ${alias}.first_name, ${alias}.middle_name),
      'avatar_id', ${alias}.avatar_id
    )`;
  }

  static async list(filters = {}) {
    const { id, issue_id, user_id, date, date_before, date_after, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    // id can be single or array
    if (Array.isArray(id) && id.length) {
      where.push(`t.id = ANY($${idx}::int[])`); values.push(id); idx++;
    } else if (id !== undefined) { where.push(`t.id = $${idx++}`); values.push(id); }
    // issue_id can be single or array
    if (Array.isArray(issue_id) && issue_id.length) {
      where.push(`t.issue_id = ANY($${idx}::int[])`); values.push(issue_id); idx++;
    } else if (issue_id !== undefined) { where.push(`t.issue_id = $${idx++}`); values.push(issue_id); }
    // user_id can be single or array
    if (Array.isArray(user_id) && user_id.length) {
      where.push(`t.user_id = ANY($${idx}::int[])`); values.push(user_id); idx++;
    } else if (user_id !== undefined) { where.push(`t.user_id = $${idx++}`); values.push(user_id); }
    // date can be single or array
    if (Array.isArray(date) && date.length) {
      where.push(`t.date = ANY($${idx}::date[])`); values.push(date); idx++;
    } else if (date) { where.push(`t.date = $${idx++}`); values.push(date); }
    if (date_before) { where.push(`t.date <= $${idx++}`); values.push(date_before); }
    if (date_after) { where.push(`t.date >= $${idx++}`); values.push(date_after); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT
      t.id,
      t.issue_id,
      ${TimeLog.userJsonSql('u')} AS user,
      t.hours,
      t.date,
      t.description,
      t.created_at,
      t.updated_at
      FROM time_logs t
      LEFT JOIN users u ON u.id = t.user_id
      ${whereSql} ORDER BY t.id`;
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
    const q = `SELECT
      t.id,
      t.issue_id,
      ${TimeLog.userJsonSql('u')} AS user,
      t.hours,
      t.date,
      t.description,
      t.created_at,
      t.updated_at
      FROM time_logs t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.id = $1
      LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO time_logs (issue_id, user_id, hours, date, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`;
    const vals = [fields.issue_id, fields.user_id, fields.hours, fields.date, fields.description];
    const res = await pool.query(q, vals);
    return await TimeLog.findById(res.rows[0].id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['issue_id','user_id','hours','date','description'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await TimeLog.findById(id);
    const q = `UPDATE time_logs SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    if (!res.rows[0]) return null;
    return await TimeLog.findById(res.rows[0].id);
  }

  static async delete(id) {
    const q = `DELETE FROM time_logs WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = TimeLog;
