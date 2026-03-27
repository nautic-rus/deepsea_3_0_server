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
    let q = `SELECT sp.id, sp.part_code, sp.quantity, sp.source, sp.created_at,
      row_to_json(m.*) AS material,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN materials m ON m.id = sp.material_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      ${whereSql} ORDER BY sp.id`;
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
    const q = `SELECT sp.id, sp.part_code, sp.quantity, sp.source, sp.created_at,
      row_to_json(m.*) AS material,
      json_build_object('id', cu.id, 'username', cu.username, 'first_name', cu.first_name, 'last_name', cu.last_name, 'email', cu.email, 'avatar_id', cu.avatar_id) AS created_by,
      row_to_json(sv.*) AS specification_version
      FROM specification_parts sp
      LEFT JOIN materials m ON m.id = sp.material_id
      LEFT JOIN users cu ON cu.id = sp.created_by
      LEFT JOIN specification_version sv ON sv.id = sp.specification_version_id
      WHERE sp.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO specification_parts (specification_version_id, parent_id, part_code, material_id, quantity, created_by, source) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`;
    const vals = [fields.specification_version_id, fields.parent_id || null, fields.part_code || null, fields.material_id || null, fields.quantity || 1, fields.created_by, fields.source || 'manual'];
    const res = await pool.query(q, vals);
    const inserted = res.rows[0];
    if (!inserted) return null;
    return await SpecificationPart.findById(inserted.id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['parent_id','part_code','material_id','quantity','source'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await SpecificationPart.findById(id);
    const q = `UPDATE specification_parts SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, specification_version_id, parent_id, part_code, material_id, quantity, source, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    const updated = res.rows[0] || null;
    if (!updated) return null;
    return await SpecificationPart.findById(updated.id);
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
