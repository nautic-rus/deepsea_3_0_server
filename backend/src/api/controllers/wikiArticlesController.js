const WikiArticlesService = require('../services/wikiArticlesService');

class WikiArticlesController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await WikiArticlesService.listArticles(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await WikiArticlesService.getArticleById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await WikiArticlesService.createArticle(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await WikiArticlesService.updateArticle(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await WikiArticlesService.deleteArticle(id, actor);
      res.json({ message: 'Article deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = WikiArticlesController;
