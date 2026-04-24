const WikiArticlesService = require('../services/wikiArticlesService');

class WikiArticlesController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const query = Object.assign({}, req.query || {});
      // Support arrays for certain numeric filter params: accept comma-separated strings or repeated query params
      const multiParamsNum = ['section_id', 'created_by', 'organization_id', 'organization_ids', 'project_id', 'project_ids'];
      const multiParamsStr = ['status'];
      for (const p of multiParamsNum) {
        if (query[p] !== undefined && query[p] !== null) {
          if (Array.isArray(query[p])) {
            query[p] = query[p].map(v => Number(v));
          } else if (String(query[p]).includes(',')) {
            query[p] = String(query[p]).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
          } else {
            query[p] = Number(query[p]);
          }
        }
      }
      for (const p of multiParamsStr) {
        if (query[p] !== undefined && query[p] !== null) {
          if (Array.isArray(query[p])) {
            query[p] = query[p].map(v => String(v));
          } else if (String(query[p]).includes(',')) {
            query[p] = String(query[p]).split(',').map(s => s.trim());
          } else {
            query[p] = String(query[p]);
          }
        }
      }
      // support my_article filter: if true, return articles where actor is author
      if (query.my_article !== undefined && query.my_article !== null) {
        const val = query.my_article === true || query.my_article === 'true' || query.my_article === '1';
        if (val && actor && actor.id) {
          query.created_by = actor.id;
        }
        delete query.my_article;
      }

      const rows = await WikiArticlesService.listArticles(query || {}, actor);
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
