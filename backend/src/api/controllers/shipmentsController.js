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

  // items
  static async listItems(req, res, next) {
    try {
      const actor = req.user || null;
      const shipment_id = parseInt(req.params.shipment_id, 10);
      const rows = await ShipmentsService.listItems(shipment_id, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async createItem(req, res, next) {
    try {
      const actor = req.user || null;
      const shipment_id = parseInt(req.params.shipment_id, 10);
      const created = await ShipmentsService.createItem(shipment_id, req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async updateItem(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await ShipmentsService.updateItem(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async deleteItem(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await ShipmentsService.deleteItem(id, actor);
      res.json({ message: 'Shipment item deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = ShipmentsController;
