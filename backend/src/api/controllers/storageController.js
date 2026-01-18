const StorageService = require('../services/storageService');
const multer = require('multer');

// Use memory storage: file will be available as buffer on req.file
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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
      // When file is uploaded via multipart/form-data (field name 'file'), delegate to uploadAndCreate
      if (req.file) {
        const created = await StorageService.uploadAndCreate(req.file, actor, req.body || {});
        res.status(201).json({ data: created });
        return;
      }
      const created = await StorageService.createStorage(req.body || {}, actor);
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
}

module.exports = StorageController;
