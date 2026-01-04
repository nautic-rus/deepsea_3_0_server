const EquipmentService = require('../services/equipmentService');

/**
 * EquipmentController
 *
 * HTTP controller for equipment CRUD endpoints. Maps incoming requests to
 * EquipmentService and returns JSON responses.
 */
class EquipmentController {
  /**
   * List equipment items with query filters.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await EquipmentService.listEquipment(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Get equipment by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await EquipmentService.getEquipmentById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a new equipment record.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await EquipmentService.createEquipment(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update an equipment record.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await EquipmentService.updateEquipment(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete (soft-delete) an equipment record.
   */
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
