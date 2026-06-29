const pool = require('../connection');

class ShipmentStorageType {
  static async list() {
    const res = await pool.query('SELECT * FROM shipment_storage_types ORDER BY id');
    return res.rows || [];
  }

  static async findById(id) {
    const res = await pool.query('SELECT * FROM shipment_storage_types WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = 'INSERT INTO shipment_storage_types (code, name, description, is_active) VALUES ($1,$2,$3,$4) RETURNING *';
    const vals = [fields.code, fields.name, fields.description || null, typeof fields.is_active === 'undefined' ? true : !!fields.is_active];
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const vals = [];
    let idx = 1;
    ['code', 'name', 'description', 'is_active'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) return await ShipmentStorageType.findById(id);
    const q = `UPDATE shipment_storage_types SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const res = await pool.query('DELETE FROM shipment_storage_types WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = ShipmentStorageType;
