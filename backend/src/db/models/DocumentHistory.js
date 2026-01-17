const pool = require('../connection');

/**
 * DocumentHistory data access object for existing `documents_history` schema.
 * The project's DB schema defines `documents_history` with columns:
 *   id, document_id, field_name, old_value, new_value, changed_by, created_at
 * This model maps service calls (action + details) into that structure.
 */
class DocumentHistory {
  static async create(fields) {
    const documentId = fields.document_id;
    const actorId = fields.actor_id || null;
    const action = fields.action || null; // maps to field_name
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

    const q = `INSERT INTO documents_history (document_id, field_name, old_value, new_value, changed_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, document_id, field_name, old_value, new_value, changed_by, created_at`;
    const vals = [documentId, action, oldValue, newValue, actorId];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async listByDocument(documentId) {
    const q = `SELECT id, document_id, field_name, old_value, new_value, changed_by, created_at FROM documents_history WHERE document_id = $1 ORDER BY created_at ASC`;
    const res = await pool.query(q, [documentId]);
    return res.rows;
  }
}

module.exports = DocumentHistory;
