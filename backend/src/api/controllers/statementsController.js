const StatementsService = require('../services/statementsService');

class StatementsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await StatementsService.listStatements(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await StatementsService.getStatementById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await StatementsService.createStatement(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await StatementsService.updateStatement(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await StatementsService.deleteStatement(id, actor);
      res.json({ message: 'Statement deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = StatementsController;
