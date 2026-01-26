const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

class AuditLogsService {
  /**
   * List audit logs with optional filters: actor_id, entity, entity_id, limit, offset
   */
  static async listLogs(filters = {}, actor) {
    const requiredPermission = 'audit.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission audit.view'); err.statusCode = 403; throw err; }

    const params = [];
    let idx = 1;
    let where = 'WHERE 1=1';

    if (filters.actor_id) {
      where += ` AND actor_id = $${idx}`;
      params.push(Number(filters.actor_id));
      idx += 1;
    }
    if (filters.entity) {
      where += ` AND entity = $${idx}`;
      params.push(String(filters.entity));
      idx += 1;
    }
    if (filters.entity_id) {
      where += ` AND entity_id = $${idx}`;
      params.push(Number(filters.entity_id));
      idx += 1;
    }

    const limit = Math.min( (filters.limit ? Number(filters.limit) : 50), 1000 );
    const offset = filters.offset ? Number(filters.offset) : 0;

    const q = `
      SELECT id, actor_id, entity, entity_id, action, details, created_at
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(limit, offset);

    const res = await pool.query(q, params);
    return res.rows;
  }
}

module.exports = AuditLogsService;
