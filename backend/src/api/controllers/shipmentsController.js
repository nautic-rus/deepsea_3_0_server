const ShipmentsService = require('../services/shipmentsService');

class ShipmentsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await ShipmentsService.listShipments(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await ShipmentsService.getShipmentById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await ShipmentsService.createShipment(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ShipmentsService.updateShipment(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await ShipmentsService.deleteShipment(id, actor);
      res.json({ message: 'Shipment deleted' });
    } catch (err) { next(err); }
  }

  static async attachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (req.file) {
        const StorageService = require('../services/storageService');
        const createdStorage = await StorageService.uploadAndCreate(req.file, actor, req.body || {});
        const created = await ShipmentsService.attachFileToShipment(Number(id), Number(createdStorage.id), actor);
        res.status(201).json({ data: created });
        return;
      }
      const { storage_id } = req.body || {};
      const storagePayload = Array.isArray(storage_id) ? storage_id.map(Number) : Number(storage_id);
      const created = await ShipmentsService.attachFileToShipment(Number(id), storagePayload, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async attachLocalFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (!req.file) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
      const StorageService = require('../services/storageService');
      const createdStorage = await StorageService.uploadToLocalAndCreate(req.file, actor, req.body || {});
      const created = await ShipmentsService.attachFileToShipment(Number(id), Number(createdStorage.id), actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async detachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const storageId = parseInt(req.params.storage_id, 10);
      await ShipmentsService.detachFileFromShipment(Number(id), Number(storageId), actor);
      res.json({ message: 'File detached' });
    } catch (err) { next(err); }
  }

  static async listFiles(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { limit, offset = 0 } = req.query || {};
      const rows = await ShipmentsService.listShipmentFiles(Number(id), { limit: limit != null ? Number(limit) : undefined, offset: Number(offset) }, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }
}

module.exports = ShipmentsController;
