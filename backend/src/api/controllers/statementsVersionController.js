const StatementsVersionService = require('../services/statementsVersionService');

class StatementsVersionController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await StatementsVersionService.list(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const row = await StatementsVersionService.getById(id, actor);
      res.json({ data: row });
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await StatementsVersionService.create(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      const updated = await StatementsVersionService.update(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = Number(req.params.id);
      await StatementsVersionService.delete(id, actor);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = StatementsVersionController;
