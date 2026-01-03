const pool = require('../connection');

class MaterialKit {
  static async list(filters = {}) {
    const { page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (search) { where.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, code, name, description, created_by, updated_by, created_at, updated_at FROM material_kits ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, code, name, description, created_by, updated_by, created_at, updated_at FROM material_kits WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO material_kits (code, name, description, created_by, updated_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, code, name, description, created_by, updated_by, created_at, updated_at`;
    const vals = [fields.code, fields.name, fields.description || null, fields.created_by, fields.updated_by || null];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['code','name','description','updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await MaterialKit.findById(id);
    const q = `UPDATE material_kits SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, code, name, description, created_by, updated_by, created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE material_kits SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM material_kits WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = MaterialKit;
