const pool = require('../connection');

class Role {
  static async list() {
    const q = `SELECT id, name, description, created_at FROM roles ORDER BY id`;
    const res = await pool.query(q);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, name, description, created_at FROM roles WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create({ name, description }) {
    const q = `INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at`;
    const res = await pool.query(q, [name, description]);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    if (fields.name !== undefined) { parts.push(`name = $${idx++}`); values.push(fields.name); }
    if (fields.description !== undefined) { parts.push(`description = $${idx++}`); values.push(fields.description); }
    if (parts.length === 0) return await Role.findById(id);
    const q = `UPDATE roles SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, name, description, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    // Try soft-delete via is_active flag; if it fails, fallback to hard delete
    try {
      const q = `UPDATE roles SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {
      // ignore
    }
    const q2 = `DELETE FROM roles WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Role;
