const pool = require('../connection');

class MaterialsDirectory {
  static async list({ page = 1, limit, search } = {}) {
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (search) { where.push(`name ILIKE $${idx}`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT md.id, md.name, md.path, md.parent_id, md.description, md.order_index, md.created_by, md.updated_by, md.created_at, md.updated_at,
      concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name) AS created_by_full_name,
      concat_ws(' ', uu.last_name, uu.first_name, uu.middle_name) AS updated_by_full_name
      FROM equipment_materials_directories md
      LEFT JOIN users cu ON cu.id = md.created_by
      LEFT JOIN users uu ON uu.id = md.updated_by
      ${whereSql}
      ORDER BY md.id`;
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
    const q = `SELECT md.id, md.name, md.path, md.parent_id, md.description, md.order_index, md.created_by, md.updated_by, md.created_at, md.updated_at,
      concat_ws(' ', cu.last_name, cu.first_name, cu.middle_name) AS created_by_full_name,
      concat_ws(' ', uu.last_name, uu.first_name, uu.middle_name) AS updated_by_full_name
      FROM equipment_materials_directories md
      LEFT JOIN users cu ON cu.id = md.created_by
      LEFT JOIN users uu ON uu.id = md.updated_by
      WHERE md.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const allowed = ['name','path','parent_id','description','order_index','created_by','updated_by'];
    const cols = [];
    const placeholders = [];
    const values = [];
    let idx = 1;
    for (const c of allowed) {
      if (fields[c] !== undefined) {
        cols.push(c);
        placeholders.push(`$${idx++}`);
        values.push(fields[c]);
      }
    }
    if (cols.length === 0) throw new Error('No fields provided');
    const q = `INSERT INTO equipment_materials_directories (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`;
    const res = await pool.query(q, values);
    const r = res.rows[0];
    if (!r) return null;
    return await MaterialsDirectory.findById(r.id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['name','path','parent_id','description','order_index','updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await MaterialsDirectory.findById(id);
    const q = `UPDATE equipment_materials_directories SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    const r = res.rows[0];
    if (!r) return null;
    return await MaterialsDirectory.findById(r.id);
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE equipment_materials_directories SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM equipment_materials_directories WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = MaterialsDirectory;
