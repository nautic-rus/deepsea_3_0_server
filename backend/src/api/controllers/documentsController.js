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
      const { content, parent_id = null } = req.body || {};
      const created = await DocumentsService.addDocumentMessage(Number(id), content, actor, parent_id);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/documents/:id/messages - list messages for a document
   */
  static async listMessages(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { limit = 100, offset = 0 } = req.query || {};
      const rows = await DocumentsService.listDocumentMessages(Number(id), { limit: Number(limit), offset: Number(offset) }, actor);
      res.json({ data: rows });
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
        // Build metadata from request body if provided
        const metadata = {
          type_id: req.body && req.body.type_id ? Number(req.body.type_id) : undefined,
          rev: req.body && req.body.rev ? Number(req.body.rev) : undefined,
          archive: req.body && typeof req.body.archive !== 'undefined' ? (req.body.archive === 'true' || req.body.archive === true) : undefined,
          archive_data: req.body && req.body.archive_data ? req.body.archive_data : undefined
        };
        const created = await DocumentsService.attachFileToDocument(Number(id), Number(createdStorage.id), actor, metadata);
        res.status(201).json({ data: created });
        return;
      }
      const { storage_id } = req.body || {};
      const metadata = {
        type_id: req.body && req.body.type_id ? Number(req.body.type_id) : undefined,
        rev: req.body && req.body.rev ? Number(req.body.rev) : undefined,
        archive: req.body && typeof req.body.archive !== 'undefined' ? (req.body.archive === 'true' || req.body.archive === true) : undefined,
        archive_data: req.body && req.body.archive_data ? req.body.archive_data : undefined
      };
      const created = await DocumentsService.attachFileToDocument(Number(id), Number(storage_id), actor, metadata);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * PUT /api/documents/:id/files - update metadata for an attached file
   * Body: { storage_id: number, type_id?, rev?, archive?, archive_data?, user_id? }
   */
  static async updateFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { storage_id } = req.body || {};
      if (!storage_id) { const err = new Error('Missing storage_id'); err.statusCode = 400; throw err; }

      const metadata = {
        type_id: typeof req.body.type_id !== 'undefined' ? (req.body.type_id === null ? null : Number(req.body.type_id)) : undefined,
        rev: typeof req.body.rev !== 'undefined' ? (req.body.rev === null ? null : Number(req.body.rev)) : undefined,
        archive: typeof req.body.archive !== 'undefined' ? (req.body.archive === true || req.body.archive === 'true') : undefined,
        archive_data: typeof req.body.archive_data !== 'undefined' ? req.body.archive_data : undefined,
        user_id: typeof req.body.user_id !== 'undefined' ? (req.body.user_id === null ? null : Number(req.body.user_id)) : undefined
      };

      const updated = await DocumentsService.updateFileMetadata(Number(id), Number(storage_id), metadata, actor);
      if (!updated) { const err = new Error('Attached file not found'); err.statusCode = 404; throw err; }
      res.json({ data: updated });
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
      const metadata = {
        type_id: req.body && req.body.type_id ? Number(req.body.type_id) : undefined,
        rev: req.body && req.body.rev ? Number(req.body.rev) : undefined,
        archive: req.body && typeof req.body.archive !== 'undefined' ? (req.body.archive === 'true' || req.body.archive === true) : undefined,
        archive_data: req.body && req.body.archive_data ? req.body.archive_data : undefined
      };
      const created = await DocumentsService.attachFileToDocument(Number(id), Number(createdStorage.id), actor, metadata);
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

  /**
   * GET /api/documents/directories - list document directories
   */
  static async listDirectories(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await DocumentsService.listDirectories(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/document_types - list document types
   */
  static async listTypes(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await DocumentsService.listTypes(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/document_types/:id - get single document type
   */
  static async getType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await DocumentsService.getTypeById(id, actor);
      if (!row) { const err = new Error('Type not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * POST /api/document_types - create a new document type
   */
  static async createType(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await DocumentsService.createType(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * PUT /api/document_types/:id - update document type
   */
  static async updateType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await DocumentsService.updateType(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/document_types/:id - delete document type
   */
  static async deleteType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await DocumentsService.deleteType(Number(id), actor);
      if (!ok) { const err = new Error('Type not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Type deleted' });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/document_statuses - list document statuses
   */
  static async listStatuses(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await DocumentsService.listStatuses(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/document_statuses/:id - get single document status
   */
  static async getStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await DocumentsService.getStatusById(id, actor);
      if (!row) { const err = new Error('Status not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * POST /api/document_statuses - create a new document status
   */
  static async createStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await DocumentsService.createStatus(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * PUT /api/document_statuses/:id - update document status
   */
  static async updateStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await DocumentsService.updateStatus(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/document_statuses/:id - delete document status
   */
  static async deleteStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await DocumentsService.deleteStatus(Number(id), actor);
      if (!ok) { const err = new Error('Status not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Status deleted' });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/document_storage_types - list storage types for documents
   */
  static async listStorageTypes(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await DocumentsService.listStorageTypes(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/document_storage_types/:id - get single storage type
   */
  static async getStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await DocumentsService.getStorageTypeById(id, actor);
      if (!row) { const err = new Error('Storage type not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * POST /api/document_storage_types - create a new storage type
   */
  static async createStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await DocumentsService.createStorageType(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * PUT /api/document_storage_types/:id - update storage type
   */
  static async updateStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await DocumentsService.updateStorageType(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/document_storage_types/:id - delete storage type
   */
  static async deleteStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await DocumentsService.deleteStorageType(Number(id), actor);
      if (!ok) { const err = new Error('Storage type not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Storage type deleted' });
    } catch (err) { next(err); }
  }

  /**
   * POST /api/documents/directories - create a new directory
   */
  static async createDirectory(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await DocumentsService.createDirectory(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * PUT /api/documents/directories/:id - update directory
   */
  static async updateDirectory(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await DocumentsService.updateDirectory(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/documents/directories/:id - delete directory
   */
  static async deleteDirectory(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await DocumentsService.deleteDirectory(Number(id), actor);
      res.json({ message: 'Directory deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = DocumentsController;

