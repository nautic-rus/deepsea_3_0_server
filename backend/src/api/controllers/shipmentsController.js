const ShipmentsService = require('../services/shipmentsService');

class ShipmentsController {
  static _parseRev(v) {
    if (v === null) return null;
    if (typeof v === 'undefined') return undefined;
    const s = String(v).trim();
    if (s === '') return undefined;
    if (/^[0-9]+$/.test(s)) return Number(s);
    return s;
  }

  static _parseBool(v) {
    if (v === null) return null;
    if (typeof v === 'undefined') return undefined;
    if (v === true || v === false) return v;
    const s = String(v).trim().toLowerCase();
    if (s === '') return undefined;
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    return undefined;
  }

  static _buildFileMetadata(body = {}) {
    return {
      type_id: typeof body.type_id !== 'undefined' ? (body.type_id === null ? null : Number(body.type_id)) : undefined,
      rev: typeof body.rev !== 'undefined' ? (body.rev === null ? null : ShipmentsController._parseRev(body.rev)) : undefined,
      archive: typeof body.archive !== 'undefined' ? ShipmentsController._parseBool(body.archive) : undefined,
      archive_data: typeof body.archive_data !== 'undefined' ? body.archive_data : undefined,
      status_id: typeof body.status !== 'undefined' ? (body.status === null ? null : Number(body.status)) : undefined,
      reason_id: typeof body.reason !== 'undefined' ? (body.reason === null ? null : Number(body.reason)) : undefined,
      comment: typeof body.comment !== 'undefined' ? body.comment : undefined
    };
  }

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

  static async addMessage(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { content, parent_id = null } = req.body || {};
      const created = await ShipmentsService.addShipmentMessage(Number(id), content, actor, parent_id);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async attachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (req.file) {
        const StorageService = require('../services/storageService');
        const createdStorage = await StorageService.uploadAndCreate(req.file, actor, req.body || {});
        const created = await ShipmentsService.attachFileToShipment(
          Number(id),
          Number(createdStorage.id),
          actor,
          ShipmentsController._buildFileMetadata(req.body || {})
        );
        res.status(201).json({ data: created });
        return;
      }
      const { storage_id } = req.body || {};
      const storagePayload = Array.isArray(storage_id) ? storage_id.map(Number) : Number(storage_id);
      const created = await ShipmentsService.attachFileToShipment(
        Number(id),
        storagePayload,
        actor,
        ShipmentsController._buildFileMetadata(req.body || {})
      );
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

  static async listMessages(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { limit, offset = 0 } = req.query || {};
      const rows = await ShipmentsService.listShipmentMessages(Number(id), { limit: limit != null ? Number(limit) : undefined, offset: Number(offset) }, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async listShipmentStatuses(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await ShipmentsService.listShipmentStatuses(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async getShipmentStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await ShipmentsService.getShipmentStatusById(id, actor);
      if (!row) { const err = new Error('Shipment status not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  static async createShipmentStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await ShipmentsService.createShipmentStatus(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async updateShipmentStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ShipmentsService.updateShipmentStatus(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async deleteShipmentStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await ShipmentsService.deleteShipmentStatus(Number(id), actor);
      if (!ok) { const err = new Error('Shipment status not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Shipment status deleted' });
    } catch (err) { next(err); }
  }

  static async listShipmentStorageTypes(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await ShipmentsService.listShipmentStorageTypes(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async getShipmentStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await ShipmentsService.getShipmentStorageTypeById(id, actor);
      if (!row) { const err = new Error('Shipment storage type not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  static async createShipmentStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await ShipmentsService.createShipmentStorageType(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async updateShipmentStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ShipmentsService.updateShipmentStorageType(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async deleteShipmentStorageType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await ShipmentsService.deleteShipmentStorageType(Number(id), actor);
      if (!ok) { const err = new Error('Shipment storage type not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Shipment storage type deleted' });
    } catch (err) { next(err); }
  }

  static async listShipmentStorageStatuses(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await ShipmentsService.listShipmentStorageStatuses(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async getShipmentStorageStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await ShipmentsService.getShipmentStorageStatusById(id, actor);
      if (!row) { const err = new Error('Shipment storage status not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  static async createShipmentStorageStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await ShipmentsService.createShipmentStorageStatus(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async updateShipmentStorageStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ShipmentsService.updateShipmentStorageStatus(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async deleteShipmentStorageStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await ShipmentsService.deleteShipmentStorageStatus(Number(id), actor);
      if (!ok) { const err = new Error('Shipment storage status not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Shipment storage status deleted' });
    } catch (err) { next(err); }
  }

  static async listShipmentStorageReasons(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await ShipmentsService.listShipmentStorageReasons(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async getShipmentStorageReason(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await ShipmentsService.getShipmentStorageReasonById(id, actor);
      if (!row) { const err = new Error('Shipment storage reason not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  static async createShipmentStorageReason(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await ShipmentsService.createShipmentStorageReason(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async updateShipmentStorageReason(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ShipmentsService.updateShipmentStorageReason(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async deleteShipmentStorageReason(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await ShipmentsService.deleteShipmentStorageReason(Number(id), actor);
      if (!ok) { const err = new Error('Shipment storage reason not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Shipment storage reason deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = ShipmentsController;
