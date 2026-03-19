const pool = require('../connection');

class DocumentMessage {
  /**
   * Create a document message. parent_id is optional and can be used to reply to another message.
   * @param {Object} param0
   * @param {number} param0.document_id
   * @param {number} param0.user_id
   * @param {string} param0.content
   * @param {number|null} [param0.parent_id]
   */
  static async create({ document_id, user_id, content, parent_id = null }) {
    const q = `INSERT INTO document_messages (document_id, user_id, content, parent_id) VALUES ($1,$2,$3,$4) RETURNING id, document_id, user_id, content, parent_id, created_at`;
    const res = await pool.query(q, [document_id, user_id, content, parent_id]);
    return res.rows[0];
  }

  /**
   * List messages for a document. Returns parent_id for threading.
   */
  static async listByDocument(documentId, { limit, offset = 0 } = {}) {
    let q = `SELECT id, document_id, user_id, content, parent_id, created_at FROM document_messages WHERE document_id = $1 ORDER BY id DESC`;
    const params = [documentId];
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

module.exports = DocumentMessage;
