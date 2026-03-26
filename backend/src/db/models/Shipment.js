const pool = require('../connection');

class Shipment {
  static async list(filters = {}) {
    const { project_id, supplier_id, equipment_id, page = 1, limit, search } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (project_id) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (supplier_id) { where.push(`supplier_id = $${idx++}`); values.push(supplier_id); }
    if (equipment_id) { where.push(`equipment_id = $${idx++}`); values.push(equipment_id); }
    if (search) { where.push(`(code ILIKE $${idx} OR CAST(id AS TEXT) = $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, project_id, supplier_id, equipment_id, code, received_at, created_by, created_at FROM shipments ${whereSql} ORDER BY id`;
    if (limit != null) { q += ` LIMIT $${idx++} OFFSET $${idx}`; values.push(limit, offset); }
    else if (offset) { q += ` OFFSET $${idx}`; values.push(offset); }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, project_id, supplier_id, equipment_id, code, received_at, created_by, created_at FROM shipments WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO shipments (project_id, supplier_id, equipment_id, code, received_at, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, project_id, supplier_id, equipment_id, code, received_at, created_by, created_at`;
    const vals = [fields.project_id || null, fields.supplier_id || null, fields.equipment_id || null, fields.code || null, fields.received_at || null, fields.created_by || null];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['project_id','supplier_id','equipment_id','code','received_at'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Shipment.findById(id);
    const q = `UPDATE shipments SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, project_id, supplier_id, equipment_id, code, received_at, created_by, created_at`;
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
