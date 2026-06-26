const pool = require('../connection');

class ShipmentMessage {
  /**
   * Create a new message attached to a shipment
   * @param {{shipment_id:number,user_id:number,content:string,parent_id?:number|null}} payload
   */
  static async create({ shipment_id, user_id, content, parent_id = null }) {
    const q = `INSERT INTO shipment_messages (shipment_id, user_id, content, parent_id) VALUES ($1,$2,$3,$4) RETURNING id, shipment_id, user_id, content, parent_id, created_at`;
    const res = await pool.query(q, [shipment_id, user_id, content, parent_id || null]);
    return res.rows[0];
  }

  static async listByShipment(shipmentId, { limit, offset = 0 } = {}) {
    let q = `SELECT id, shipment_id, user_id, content, parent_id, created_at FROM shipment_messages WHERE shipment_id = $1 ORDER BY id DESC`;
    const params = [shipmentId];
    if (limit != null) {
      params.push(limit, offset);
      q += ` LIMIT $2 OFFSET $3`;
    } else if (offset) {
      params.push(offset);
      q += ` OFFSET $2`;
    }
    const res = await pool.query(q, params);
    return res.rows;
  }
}

module.exports = ShipmentMessage;
