const pool = require('../connection');

class Shipment {
  static async list(filters = {}) {
    const { supplier_id, page = 1, limit, search } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (supplier_id) { where.push(`s.supplier_id = $${idx++}`); values.push(supplier_id); }
    if (search) { where.push(`(s.code ILIKE $${idx} OR CAST(s.id AS TEXT) = $${idx} OR s.model ILIKE $${idx} OR s.manufacturer ILIKE $${idx} OR s.description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT s.id, s.supplier_id, s.code, s.model, s.manufacturer, s.description, s.received_at, json_build_object('id', u.id, 'full_name', concat_ws(' ', u.last_name, u.first_name, u.middle_name), 'avatar_id', u.avatar_id) AS created_by, s.created_at, s.updated_at FROM shipments s LEFT JOIN users u ON s.created_by = u.id ${whereSql} ORDER BY s.id DESC`;
    if (limit != null) { q += ` LIMIT $${idx++} OFFSET $${idx}`; values.push(limit, offset); }
    else if (offset) { q += ` OFFSET $${idx}`; values.push(offset); }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT s.id, s.supplier_id, s.code, s.model, s.manufacturer, s.description, s.received_at, json_build_object('id', u.id, 'full_name', concat_ws(' ', u.last_name, u.first_name, u.middle_name), 'avatar_id', u.avatar_id) AS created_by, s.created_at, s.updated_at FROM shipments s LEFT JOIN users u ON s.created_by = u.id WHERE s.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO shipments (supplier_id, code, model, manufacturer, description, received_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, supplier_id, code, model, manufacturer, description, received_at, created_by, created_at, updated_at`;
    const vals = [fields.supplier_id || null, fields.code || null, fields.model || null, fields.manufacturer || null, fields.description || null, fields.received_at || null, fields.created_by || null];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['supplier_id','code','model','manufacturer','description','received_at'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Shipment.findById(id);
    const q = `UPDATE shipments SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, supplier_id, code, model, manufacturer, description, received_at, created_by, created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE shipments SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM shipments WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Shipment;
