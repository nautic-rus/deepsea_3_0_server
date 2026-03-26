const pool = require('../connection');

class Supplier {
  static async list(filters = {}) {
    const { is_active, country, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (is_active !== undefined) { where.push(`is_active = $${idx++}`); values.push(is_active === 'true' || is_active === true); }
    if (country) { where.push(`country = $${idx++}`); values.push(country); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx} OR code ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, name, code, description, contact_person, email, phone, address, website, country, is_active, created_by, updated_by, created_at, updated_at FROM suppliers ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, name, code, description, contact_person, email, phone, address, website, country, is_active, created_by, updated_by, created_at, updated_at FROM suppliers WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO suppliers (name, code, description, contact_person, email, phone, address, website, country, is_active, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, name, code, description, contact_person, email, phone, address, website, country, is_active, created_by, created_at`;
    const vals = [fields.name, fields.code, fields.description, fields.contact_person, fields.email, fields.phone, fields.address, fields.website, fields.country, fields.is_active !== undefined ? fields.is_active : true, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['name','code','description','contact_person','email','phone','address','website','country','is_active'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Supplier.findById(id);
    parts.push(`updated_by = $${idx++}`);
    values.push(fields.updated_by || null);
    const q = `UPDATE suppliers SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, name, code, description, contact_person, email, phone, address, website, country, is_active, created_by, updated_by, created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    const q = `UPDATE suppliers SET is_active = false WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = Supplier;

