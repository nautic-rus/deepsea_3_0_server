const pool = require('../connection');

class MaterialKitItem {
  static async list(filters = {}) {
    const { kit_id, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (kit_id) { where.push(`kit_id = $${idx++}`); values.push(kit_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, kit_id, material_id, stock_code, quantity, unit_id, notes, created_at FROM material_kit_items ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, kit_id, material_id, stock_code, quantity, unit_id, notes, created_at FROM material_kit_items WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO material_kit_items (kit_id, material_id, stock_code, quantity, unit_id, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, kit_id, material_id, stock_code, quantity, unit_id, notes, created_at`;
    const vals = [fields.kit_id, fields.material_id || null, fields.stock_code || null, fields.quantity || 1, fields.unit_id || null, fields.notes || null];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['material_id','stock_code','quantity','unit_id','notes'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await MaterialKitItem.findById(id);
    const q = `UPDATE material_kit_items SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, kit_id, material_id, stock_code, quantity, unit_id, notes, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE material_kit_items SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM material_kit_items WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = MaterialKitItem;
