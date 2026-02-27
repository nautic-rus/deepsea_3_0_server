const StorageService = require('../services/storageService');
const multer = require('multer');

// Use memory storage: file will be available as buffer on req.file
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

/**
 * StorageController
 *
 * Handles HTTP endpoints for storage resources (files/objects). Delegates to
 * StorageService for permission checks and persistence.
 */
class StorageController {
  /**
   * List storage objects.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await StorageService.listStorage(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Get a storage object by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await StorageService.getStorageById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a storage record.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      // For direct file uploads use explicit endpoints:
      // - POST /api/storage/local  -> upload to local storage
      // - POST /api/storage/s3     -> upload to S3
      // This create() handler only creates DB records when bucket_name/object_key provided.
      if (req.file) { const err = new Error('Direct file uploads are not supported on this endpoint. Use /api/storage/local or /api/storage/s3'); err.statusCode = 400; throw err; }
      const created = await StorageService.createStorage(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Create/upload a file specifically to local storage (backend/uploads).
   * Endpoint: POST /api/storage/local
   */
  static async uploadLocal(req, res, next) {
    try {
      const actor = req.user || null;
      if (!req.file) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
      const created = await StorageService.uploadToLocalAndCreate(req.file, actor, req.body || {});
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Upload a file specifically to S3 and create a storage DB record.
   * Endpoint: POST /api/storage/s3
   */
  static async uploadS3(req, res, next) {
    try {
      const actor = req.user || null;
      if (!req.file) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
      const created = await StorageService.uploadAndCreate(req.file, actor, req.body || {});
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update a storage record.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await StorageService.updateStorage(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete a storage record.
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await StorageService.deleteStorage(id, actor);
      res.json({ message: 'Storage item deleted' });
    } catch (err) { next(err); }
  }

  /**
   * Download/stream a storage file by id. Supports local files (streams) and S3 (redirect to URL).
   * Endpoint: GET /api/storage/:id/download
   */
  static async download(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const info = await StorageService.getFileStreamInfo(Number(id), actor);
      if (info.type === 'local') {
        // Set headers and stream
        res.setHeader('Content-Type', info.mime || 'application/octet-stream');
        // Use RFC5987 filename* to support utf8 filenames
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(info.filename)}`);
        const stream = require('fs').createReadStream(info.path);
        stream.on('error', (e) => { next(e); });
        stream.pipe(res);
        return;
      }
      if (info.type === 's3') {
        // Redirect to S3 URL (may be public)
        return res.redirect(info.url);
      }
      const err = new Error('Unsupported storage type'); err.statusCode = 500; throw err;
    } catch (err) { next(err); }
  }

  /**
   * Download multiple storage items as a single ZIP archive.
   * Endpoint: POST /api/storage/download
   * Body: { ids: [1,2,3], filename?: 'archive.zip' }
   */
  static async downloadMultiple(req, res, next) {
    try {
      const actor = req.user || null;
      const { ids, filename } = req.body || {};
      await StorageService.downloadMultipleAsZip(Array.isArray(ids) ? ids.map(Number) : [], actor, res, filename || 'files.zip');
      // Note: response streaming handled by StorageService; do not send further JSON
    } catch (err) { next(err); }
  }
}

module.exports = StorageController;
