const SpecificationPartsService = require('../services/specificationPartsService');

class SpecificationPartsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await SpecificationPartsService.list(req.query || {}, actor);
      res.json(rows);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await SpecificationPartsService.create(req.body || {}, actor);
      res.status(201).json(created);
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const updated = await SpecificationPartsService.update(req.body || {}, actor);
      res.json(updated);
    } catch (err) { next(err); }
  }
}

module.exports = SpecificationPartsController;
