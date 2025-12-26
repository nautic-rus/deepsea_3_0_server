const pool = require('../connection');

class Stage {
  static async list(filters = {}) {
    const { project_id, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (project_id) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, project_id, name, code, description, end_date, order_index, created_at FROM stages ${whereSql} ORDER BY order_index ASC, id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, project_id, name, code, description, end_date, order_index, created_at FROM stages WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO stages (project_id, name, code, description, end_date, order_index, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, project_id, name, code, description, end_date, order_index, created_at`;
    const vals = [fields.project_id, fields.name, fields.code, fields.description, fields.end_date, fields.order_index || 0, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['name','code','description','end_date','order_index'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Stage.findById(id);
    const q = `UPDATE stages SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, project_id, name, code, description, end_date, order_index, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE stages SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM stages WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Stage;
