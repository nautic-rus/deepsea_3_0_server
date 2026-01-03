const MaterialKitsService = require('../services/materialKitsService');

class MaterialKitsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await MaterialKitsService.listKits(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async getById(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await MaterialKitsService.getKitById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await MaterialKitsService.createKit(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await MaterialKitsService.updateKit(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await MaterialKitsService.deleteKit(id, actor);
      res.json({ message: 'Material kit deleted' });
    } catch (err) { next(err); }
  }

  // items
  static async listItems(req, res, next) {
    try {
      const actor = req.user || null;
      const kit_id = parseInt(req.params.kit_id, 10);
      const rows = await MaterialKitsService.listItems(kit_id, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async createItem(req, res, next) {
    try {
      const actor = req.user || null;
      const kit_id = parseInt(req.params.kit_id, 10);
      const created = await MaterialKitsService.createItem(kit_id, req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async updateItem(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await MaterialKitsService.updateItem(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async deleteItem(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await MaterialKitsService.deleteItem(id, actor);
      res.json({ message: 'Material kit item deleted' });
    } catch (err) { next(err); }
  }

  // apply kit to specification version
  static async apply(req, res, next) {
    try {
      const actor = req.user || null;
      const kitId = parseInt(req.params.id, 10);
      const { specification_version_id } = req.body || {};
      const inserted = await MaterialKitsService.applyKitToSpecification(specification_version_id, kitId, actor);
      res.json({ data: inserted });
    } catch (err) { next(err); }
  }
}

module.exports = MaterialKitsController;
