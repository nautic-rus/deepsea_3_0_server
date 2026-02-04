const EntityLinksService = require('../services/entityLinksService');

class EntityLinksController {
  /**
   * POST /api/links
   * Body: { source_type, source_id, target_type, target_id, relation_type?, blocks_closure? }
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await EntityLinksService.createLink(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/links - list/find links
   * Supports query params: id, source_type, source_id, target_type, target_id, relation_type, created_by, blocks_closure
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await EntityLinksService.listLinks(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/links/:id
   */
  static async remove(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await EntityLinksService.deleteLink(id, actor);
      res.json({ message: 'Link removed' });
    } catch (err) { next(err); }
  }
}

module.exports = EntityLinksController;
