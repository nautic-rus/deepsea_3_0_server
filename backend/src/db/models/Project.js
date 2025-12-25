const pool = require('../connection');

class Project {
  static async list({ page = 1, limit = 50, search, owner_id, status } = {}) {
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (owner_id) { where.push(`owner_id = $${idx++}`); values.push(owner_id); }
    if (status) { where.push(`status = $${idx++}`); values.push(status); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, name, description, code, status, owner_id, created_at FROM projects ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, name, description, code, status, owner_id, created_at FROM projects WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create({ name, description, code, owner_id }) {
    const q = `INSERT INTO projects (name, description, code, owner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, description, code, status, owner_id, created_at`;
    const res = await pool.query(q, [name, description, code, owner_id]);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['name','description','status','code','owner_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Project.findById(id);
    const q = `UPDATE projects SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, name, description, code, status, owner_id, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE projects SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM projects WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Project;
