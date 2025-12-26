const SpecificationsService = require('../services/specificationsService');

class SpecificationsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await SpecificationsService.listSpecifications(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await SpecificationsService.getSpecificationById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await SpecificationsService.createSpecification(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await SpecificationsService.updateSpecification(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await SpecificationsService.deleteSpecification(id, actor);
      res.json({ message: 'Specification deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = SpecificationsController;
