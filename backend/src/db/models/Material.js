const pool = require('../connection');

class Material {
  static async list(filters = {}) {
    const { directory_id, unit_id, category_id, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (directory_id) { where.push(`directory_id = $${idx++}`); values.push(directory_id); }
    if (unit_id) { where.push(`unit_id = $${idx++}`); values.push(unit_id); }
    if (category_id) { where.push(`category_id = $${idx++}`); values.push(category_id); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, stock_code, name, description, directory_id, unit_id, category_id, manufacturer, created_by, created_at FROM materials ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, stock_code, name, description, directory_id, unit_id, category_id, manufacturer, created_by, created_at FROM materials WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO materials (stock_code, name, description, directory_id, unit_id, category_id, manufacturer, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, stock_code, name, description, directory_id, unit_id, category_id, manufacturer, created_by, created_at`;
    const vals = [fields.stock_code, fields.name, fields.description, fields.directory_id, fields.unit_id, fields.category_id, fields.manufacturer, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['stock_code','name','description','directory_id','unit_id','category_id','manufacturer'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Material.findById(id);
    const q = `UPDATE materials SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, stock_code, name, description, directory_id, unit_id, category_id, manufacturer, created_by, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE materials SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM materials WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Material;
