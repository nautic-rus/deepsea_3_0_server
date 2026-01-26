const pool = require('../connection');

class AuditLog {
  /**
   * Create an audit log entry
   * payload: { actor_id, entity, entity_id, action, details }
   */
  static async create({ actor_id, entity, entity_id = null, action, details = null }) {
    const q = `
      INSERT INTO audit_logs (actor_id, entity, entity_id, action, details)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, actor_id, entity, entity_id, action, details, created_at
    `;
    const params = [actor_id, entity, entity_id, action, details ? JSON.stringify(details) : null];
    const res = await pool.query(q, params);
    return res.rows[0];
  }
}

module.exports = AuditLog;
