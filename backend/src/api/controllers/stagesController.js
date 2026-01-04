const StagesService = require('../services/stagesService');

/**
 * StagesController
 *
 * Controller for project stage endpoints. Delegates to StagesService and
 * returns JSON responses.
 */
class StagesController {
  /**
   * List stages with optional filters.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await StagesService.listStages(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Get stage by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await StagesService.getStageById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a new stage.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await StagesService.createStage(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update a stage.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await StagesService.updateStage(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete a stage.
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await StagesService.deleteStage(id, actor);
      res.json({ message: 'Stage deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = StagesController;
