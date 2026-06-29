const pool = require('../connection');

class ShipmentStorage {
  static async attach({ shipment_id, storage_id, type_id, rev, archive, archive_data, status_id, reason_id, comment }) {
    const q = `INSERT INTO shipments_storage (shipment_id, storage_id, type_id, rev, archive, archive_data, status_id, reason_id, comment)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (shipment_id, storage_id) DO UPDATE SET
        type_id = EXCLUDED.type_id,
        rev = EXCLUDED.rev,
        archive = EXCLUDED.archive,
        archive_data = EXCLUDED.archive_data,
        status_id = EXCLUDED.status_id,
        reason_id = EXCLUDED.reason_id,
        comment = EXCLUDED.comment
      RETURNING id, shipment_id, storage_id, type_id, rev, archive, archive_data, status_id, reason_id, comment, created_at`;
    const res = await pool.query(q, [
      shipment_id,
      storage_id,
      typeof type_id !== 'undefined' ? type_id : null,
      typeof rev !== 'undefined' ? rev : null,
      typeof archive !== 'undefined' ? archive : false,
      typeof archive_data !== 'undefined' ? archive_data : null,
      typeof status_id !== 'undefined' ? status_id : null,
      typeof reason_id !== 'undefined' ? reason_id : null,
      typeof comment !== 'undefined' ? comment : null
    ]);
    return res.rows[0] || null;
  }

  static async detach({ shipment_id, storage_id }) {
    const q = `DELETE FROM shipments_storage WHERE shipment_id = $1 AND storage_id = $2 RETURNING id`;
    const res = await pool.query(q, [shipment_id, storage_id]);
    return res.rows[0] || null;
  }

  static async listByShipment(shipmentId, { limit, offset = 0 } = {}) {
    let q = `SELECT s.id, s.shipment_id, s.storage_id, s.type_id, s.rev, s.archive, s.archive_data, s.status_id, s.reason_id, s.comment,
        st.url, st.bucket_name, st.object_key, st.file_name, st.file_size, st.mime_type, st.storage_type, st.uploaded_by, st.created_at AS storage_created_at
      FROM shipments_storage s JOIN storage st ON st.id = s.storage_id WHERE s.shipment_id = $1 ORDER BY s.id DESC`;
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

module.exports = ShipmentStorage;
