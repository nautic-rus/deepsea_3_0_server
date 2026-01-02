const pool = require('../connection');

class SpecificationVersion {
  static async list(filters = {}) {
    const { specification_id, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (specification_id) { where.push(`specification_id = $${idx++}`); values.push(specification_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, specification_id, version, notes, created_by, created_at FROM specification_version ${whereSql} ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, specification_id, version, notes, created_by, created_at FROM specification_version WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO specification_version (specification_id, version, notes, created_by) VALUES ($1,$2,$3,$4) RETURNING id, specification_id, version, notes, created_by, created_at`;
    const vals = [fields.specification_id, fields.version, fields.notes || null, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }
}

module.exports = SpecificationVersion;
