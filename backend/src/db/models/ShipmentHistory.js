const pool = require('../connection');

/**
 * ShipmentHistory data access object for schema `shipment_history`.
 */
class ShipmentHistory {
  static async create(fields) {
    const shipmentId = fields.shipment_id || fields.shipmentId || null;
    const actorId = fields.actor_id || fields.changed_by || null;
    const action = fields.action || null;
    let oldValue = null;
    let newValue = null;
    if (fields.details !== undefined && fields.details !== null) {
      if (typeof fields.details === 'object' && (fields.details.before !== undefined || fields.details.after !== undefined)) {
        if (fields.details.before !== undefined && fields.details.before !== null) oldValue = typeof fields.details.before === 'string' ? fields.details.before : JSON.stringify(fields.details.before);
        if (fields.details.after !== undefined && fields.details.after !== null) newValue = typeof fields.details.after === 'string' ? fields.details.after : JSON.stringify(fields.details.after);
      } else {
        newValue = typeof fields.details === 'string' ? fields.details : JSON.stringify(fields.details);
      }
    }

    const q = `INSERT INTO shipment_history (shipment_id, field_name, old_value, new_value, changed_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, shipment_id, field_name, old_value, new_value, changed_by, created_at`;
    const vals = [shipmentId, action, oldValue, newValue, actorId];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async listByShipment(shipmentId) {
    const q = `SELECT id, shipment_id, field_name, old_value, new_value, changed_by, created_at FROM shipment_history WHERE shipment_id = $1 ORDER BY created_at ASC`;
    const res = await pool.query(q, [shipmentId]);
    return res.rows;
  }
}

module.exports = ShipmentHistory;
