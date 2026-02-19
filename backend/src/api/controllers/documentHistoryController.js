const DocumentHistory = require('../../db/models/DocumentHistory');
const pool = require('../../db/connection');

/**
 * Controller to expose document history entries.
 */
class DocumentHistoryController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const documentId = Number(req.params.id);
      if (!documentId || Number.isNaN(documentId)) { const err = new Error('Invalid document id'); err.statusCode = 400; throw err; }
      // Reuse DocumentsService.getDocumentById to enforce permissions
      const DocumentsService = require('../services/documentsService');
      await DocumentsService.getDocumentById(documentId, actor);
      const rows = await DocumentHistory.listByDocument(documentId);
      if (!rows || rows.length === 0) return res.json([]);

      // Enrich history entries with user info (from changed_by)
      const userIds = [...new Set(rows.map(r => r.changed_by).filter(Boolean))];
      let usersMap = new Map();
      if (userIds.length) {
        const q = `SELECT id, email, phone, avatar_id, first_name, last_name, middle_name, username FROM users WHERE id = ANY($1::int[])`;
        const ures = await pool.query(q, [userIds]);
        usersMap = new Map((ures.rows || []).map(u => [u.id, u]));
      }

      const enriched = rows.map(r => {
        const u = usersMap.get(r.changed_by) || null;
        const fullName = u ? [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ') : null;
        return Object.assign({}, r, { user: u ? { id: u.id, full_name: fullName || u.username || u.email, email: u.email, phone: u.phone, avatar_id: u.avatar_id } : null });
      });

      return res.json(enriched);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = DocumentHistoryController;
