const AuditLogsService = require('../services/auditLogsService');

/**
 * AuditLogsController
 *
 * Controller for exposing audit log entries (read-only).
 */
class AuditLogsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const filters = {
        actor_id: req.query.actor_id,
        entity: req.query.entity,
        entity_id: req.query.entity_id,
        limit: req.query.limit,
        offset: req.query.offset
      };
      const rows = await AuditLogsService.listLogs(filters, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }
}

module.exports = AuditLogsController;
