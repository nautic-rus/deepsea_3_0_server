const pool = require('../connection');

class SpecificationVersion {
  static async list(filters = {}) {
    const { specification_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (specification_id) { where.push(`sv.specification_id = $${idx++}`); values.push(specification_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT sv.id, sv.specification_id, sv.version, sv.notes, sv.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, sv.created_at
      FROM specification_version sv
      LEFT JOIN users cu ON cu.id = sv.created_by
      ${whereSql} ORDER BY sv.id DESC`;
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
    const q = `SELECT sv.id, sv.specification_id, sv.version, sv.notes, sv.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, sv.created_at
      FROM specification_version sv
      LEFT JOIN users cu ON cu.id = sv.created_by
      WHERE sv.id = $1 LIMIT 1`;
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
