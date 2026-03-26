const pool = require('../connection');

class SpecificationPart {
  static async list(filters = {}) {
    const { specification_version_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (specification_version_id) { where.push(`specification_version_id = $${idx++}`); values.push(specification_version_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, specification_version_id, parent_id, part_code, stock_code, name, description, quantity, created_by, created_at FROM specification_parts ${whereSql} ORDER BY id`;
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
    const q = `SELECT id, specification_version_id, parent_id, part_code, stock_code, name, description, quantity, created_by, created_at FROM specification_parts WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO specification_parts (specification_version_id, parent_id, part_code, stock_code, name, description, quantity, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, specification_version_id, parent_id, part_code, stock_code, name, description, quantity, created_at`;
    const vals = [fields.specification_version_id, fields.parent_id || null, fields.part_code || null, fields.stock_code || null, fields.name, fields.description || null, fields.quantity || 1, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['parent_id','part_code','stock_code','name','description','quantity'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await SpecificationPart.findById(id);
    const q = `UPDATE specification_parts SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, specification_version_id, parent_id, part_code, stock_code, name, description, quantity, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE specification_parts SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM specification_parts WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = SpecificationPart;
