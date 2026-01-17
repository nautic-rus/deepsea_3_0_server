const DocumentHistory = require('../../db/models/DocumentHistory');

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
      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = DocumentHistoryController;
