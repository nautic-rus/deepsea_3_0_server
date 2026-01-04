const StatementsService = require('../services/statementsService');

/**
 * StatementsController
 *
 * Controller for statement endpoints; delegates to StatementsService and
 * returns JSON responses.
 */
class StatementsController {
  /**
   * List statements with optional filters.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await StatementsService.listStatements(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Retrieve a statement by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await StatementsService.getStatementById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a new statement.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await StatementsService.createStatement(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update a statement.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await StatementsService.updateStatement(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete a statement.
   */
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
