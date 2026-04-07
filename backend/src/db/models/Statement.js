const pool = require('../connection');

class Statement {
  static async list(filters = {}) {
    const { page = 1, limit, search } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT s.id, s.parent_id, s.project_id, s.code, s.name, s.description,
      json_build_object('id', u.id, 'full_name', concat_ws(' ', u.first_name, u.last_name), 'avatar_id', u.avatar_id) AS created_by,
      s.created_at
      FROM statements s
      LEFT JOIN users u ON u.id = s.created_by
      ${whereSql} ORDER BY s.id`;
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
    const q = `SELECT s.id, s.parent_id, s.project_id, s.code, s.name, s.description,
      json_build_object('id', u.id, 'full_name', concat_ws(' ', u.first_name, u.last_name), 'avatar_id', u.avatar_id) AS created_by,
      s.created_at
      FROM statements s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO statements (parent_id, project_id, code, name, description, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`;
    const vals = [fields.parent_id || null, fields.project_id || null, fields.code, fields.name, fields.description, fields.created_by];
    const res = await pool.query(q, vals);
    if (!res.rows[0]) return null;
    return await Statement.findById(res.rows[0].id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['parent_id','project_id','code','name','description'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Statement.findById(id);
    const q = `UPDATE statements SET ${parts.join(', ')} WHERE id = $${idx}`;
    values.push(id);
    const res = await pool.query(q, values);
    // return enriched row
    return await Statement.findById(id);
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE statements SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM statements WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Statement;
