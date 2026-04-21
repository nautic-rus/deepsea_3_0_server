const WikiArticleViewsService = require('../services/wikiArticleViewsService');

class WikiArticleViewsController {
  static async listMine(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await WikiArticleViewsService.listMyViews(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }
}

module.exports = WikiArticleViewsController;
