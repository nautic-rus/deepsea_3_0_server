const StatementsPartsService = require('../services/statementsPartsService');

class StatementsPartsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const result = await StatementsPartsService.list(req.query || {}, actor);
      res.json(result);
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const result = await StatementsPartsService.getById(id, actor);
      res.json(result);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await StatementsPartsService.create(req.body || {}, actor);
      res.status(201).json(created);
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const updated = await StatementsPartsService.update(id, req.body || {}, actor);
      res.json(updated);
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      await StatementsPartsService.delete(id, actor);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = StatementsPartsController;
