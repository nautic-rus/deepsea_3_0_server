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
   * Handle POST /api/documents/:id/messages - add a message to a document.
   * Body: { content: string }
   */
  static async addMessage(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { content } = req.body || {};
      const created = await DocumentsService.addDocumentMessage(Number(id), content, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * POST /api/documents/:id/files - attach existing storage item to document
   * Body: { storage_id: number }
   */
  static async attachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (req.file) {
        const StorageService = require('../services/storageService');
        const createdStorage = await StorageService.uploadAndCreate(req.file, actor, req.body || {});
        const created = await DocumentsService.attachFileToDocument(Number(id), Number(createdStorage.id), actor);
        res.status(201).json({ data: created });
        return;
      }
      const { storage_id } = req.body || {};
      const created = await DocumentsService.attachFileToDocument(Number(id), Number(storage_id), actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Attach a file uploaded to local storage and link it to a document.
   * Endpoint: POST /api/documents/:id/files/local
   */
  static async attachLocalFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (!req.file) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
      const StorageService = require('../services/storageService');
      const createdStorage = await StorageService.uploadToLocalAndCreate(req.file, actor, req.body || {});
      const created = await DocumentsService.attachFileToDocument(Number(id), Number(createdStorage.id), actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/documents/:id/files/:storage_id - detach file from document
   */
  static async detachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const storageId = parseInt(req.params.storage_id, 10);
      await DocumentsService.detachFileFromDocument(Number(id), Number(storageId), actor);
      res.json({ message: 'File detached' });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/documents/:id/files - list attached files
   */
  static async listFiles(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { limit = 100, offset = 0 } = req.query || {};
      const rows = await DocumentsService.listDocumentFiles(Number(id), { limit: Number(limit), offset: Number(offset) }, actor);
      res.json({ data: rows });
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

