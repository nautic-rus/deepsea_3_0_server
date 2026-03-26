const pool = require('../../db/connection');

const allowedTables = new Set([
  'categories',
  'customer_question_status',
  'customer_question_type',
  'document_status',
  'document_type',
  'issue_status',
  'issue_type',
  'notification_events',
  'notification_methods',
  'pages',
  'permissions',
  'roles',
  'specializations',
  'units'
]);

class ProtectionService {
  static async assertNotProtected(table, id) {
    if (!allowedTables.has(table)) return; // nothing to check for other tables
    const q = `SELECT is_protected FROM public.${table} WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [Number(id)]);
    if (res.rows && res.rows[0] && res.rows[0].is_protected === true) {
      const err = new Error('Cannot delete protected record');
      err.statusCode = 403;
      throw err;
    }
  }
}

module.exports = ProtectionService;
