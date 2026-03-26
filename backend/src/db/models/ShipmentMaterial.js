const pool = require('../connection');

class ShipmentMaterial {
  static async listByShipment(shipment_id) {
    const q = `SELECT id, shipment_id, material_id, quantity, created_at FROM shipment_materials WHERE shipment_id = $1 ORDER BY id`;
    const res = await pool.query(q, [shipment_id]);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, shipment_id, material_id, quantity, created_at FROM shipment_materials WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO shipment_materials (shipment_id, material_id, quantity) VALUES ($1,$2,$3) RETURNING id, shipment_id, material_id, quantity, created_at`;
    const vals = [fields.shipment_id, fields.material_id, fields.quantity || 0];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['shipment_id','material_id','quantity'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await ShipmentMaterial.findById(id);
    const q = `UPDATE shipment_materials SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, shipment_id, material_id, quantity, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const q = `DELETE FROM shipment_materials WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = ShipmentMaterial;
