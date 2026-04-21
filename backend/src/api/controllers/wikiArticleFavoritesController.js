const WikiArticleFavoritesService = require('../services/wikiArticleFavoritesService');

class WikiArticleFavoritesController {
  static async listMine(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await WikiArticleFavoritesService.listMyFavorites(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const article_id = parseInt(req.params.article_id, 10);
      const created = await WikiArticleFavoritesService.addFavorite(article_id, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const article_id = parseInt(req.params.article_id, 10);
      await WikiArticleFavoritesService.removeFavorite(article_id, actor);
      res.json({ message: 'Favorite removed' });
    } catch (err) { next(err); }
  }
}

module.exports = WikiArticleFavoritesController;
