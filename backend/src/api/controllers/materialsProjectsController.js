const MaterialsProjectsService = require('../services/materialsProjectsService');

class MaterialsProjectsController {
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await MaterialsProjectsService.create(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await MaterialsProjectsService.update(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await MaterialsProjectsService.delete(id, actor);
      res.json({ message: 'Material-project link deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = MaterialsProjectsController;
