const MaterialsService = require('../services/materialsService');

class MaterialsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await MaterialsService.listMaterials(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await MaterialsService.getMaterialById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await MaterialsService.createMaterial(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await MaterialsService.updateMaterial(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await MaterialsService.deleteMaterial(id, actor);
      res.json({ message: 'Material deleted' });
    } catch (err) { next(err); }
  }

  static async next_stock_code(req, res, next) {
    try {
      const actor = req.user || null;
      const code = await MaterialsService.nextStockCode(actor);
      res.json({ stock_code: code });
    } catch (err) { next(err); }
  }
}

module.exports = MaterialsController;
