const pool = require('../connection');

class DocumentStorage {
  static async attach({ document_id, storage_id }) {
    const q = `INSERT INTO documents_storage (document_id, storage_id) VALUES ($1,$2) ON CONFLICT (document_id, storage_id) DO NOTHING RETURNING id, document_id, storage_id, created_at`;
    const res = await pool.query(q, [document_id, storage_id]);
    return res.rows[0] || null;
  }

  static async detach({ document_id, storage_id }) {
    const q = `DELETE FROM documents_storage WHERE document_id = $1 AND storage_id = $2 RETURNING id`;
    const res = await pool.query(q, [document_id, storage_id]);
    return res.rows[0] || null;
  }

  static async listByDocument(documentId, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT s.id AS storage_id, st.bucket_name, st.object_key, st.storage_type, st.uploaded_by, st.created_at FROM documents_storage s JOIN storage st ON st.id = s.storage_id WHERE s.document_id = $1 ORDER BY s.id DESC LIMIT $2 OFFSET $3`;
    const res = await pool.query(q, [documentId, limit, offset]);
    return res.rows;
  }
}

module.exports = DocumentStorage;
