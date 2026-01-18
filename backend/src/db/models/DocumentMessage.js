const pool = require('../connection');

class DocumentMessage {
  static async create({ document_id, user_id, content }) {
    const q = `INSERT INTO document_messages (document_id, user_id, content) VALUES ($1,$2,$3) RETURNING id, document_id, user_id, content, created_at`;
    const res = await pool.query(q, [document_id, user_id, content]);
    return res.rows[0];
  }

  static async listByDocument(documentId, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT id, document_id, user_id, content, created_at FROM document_messages WHERE document_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
    const res = await pool.query(q, [documentId, limit, offset]);
    return res.rows;
  }
}

module.exports = DocumentMessage;
