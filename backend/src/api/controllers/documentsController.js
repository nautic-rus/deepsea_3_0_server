const DocumentsService = require('../services/documentsService');

/**
 * DocumentsController
 *
 * HTTP controller for document endpoints. Delegates to DocumentsService and
 * returns JSON responses.
 */
class DocumentsController {
  /**
   * List documents with optional query filters.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const query = Object.assign({}, req.query || {});
      if (query.is_active !== undefined) {
        query.is_active = (query.is_active === 'true' || query.is_active === '1' || query.is_active === true);
      }
      const rows = await DocumentsService.listDocuments(query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Retrieve a single document by ID.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await DocumentsService.getDocumentById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a new document.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await DocumentsService.createDocument(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update an existing document.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await DocumentsService.updateDocument(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete (soft-delete) a document.
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await DocumentsService.deleteDocument(id, actor);
      res.json({ message: 'Document deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = DocumentsController;

