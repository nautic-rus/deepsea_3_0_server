const EquipmentService = require('../services/equipmentService');

class EquipmentController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await EquipmentService.listEquipment(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await EquipmentService.getEquipmentById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await EquipmentService.createEquipment(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await EquipmentService.updateEquipment(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await EquipmentService.deleteEquipment(id, actor);
      res.json({ message: 'Equipment deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = EquipmentController;
