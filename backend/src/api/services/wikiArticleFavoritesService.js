const WikiArticleFavorite = require('../../db/models/WikiArticleFavorite');
const WikiArticle = require('../../db/models/WikiArticle');

class WikiArticleFavoritesService {
  static async listFavorites(query = {}, actor) {
    const requiredPermission = 'wiki.favorites.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    // If caller requests their own favorites, don't require special permission
    if (!query.mine) {
      const { hasPermission } = require('./permissionChecker');
      const allowed = await hasPermission(actor, requiredPermission);
      if (!allowed) { const err = new Error('Forbidden: missing permission wiki.favorites.view'); err.statusCode = 403; throw err; }
    }
    const q = Object.assign({}, query);
    if (q.user_id === undefined && q.mine) q.user_id = actor.id;
    return await WikiArticleFavorite.list(q);
  }

  static async listMyFavorites(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const filters = Object.assign({}, query);
    filters.user_id = actor.id;
    return await WikiArticleFavorite.list(filters);
  }

  static async addFavorite(article_id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!article_id || Number.isNaN(Number(article_id))) { const err = new Error('Invalid article id'); err.statusCode = 400; throw err; }
    const a = await WikiArticle.findById(Number(article_id));
    if (!a) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
    const existing = await WikiArticleFavorite.findByUserAndArticle(actor.id, Number(article_id));
    if (existing) return existing;
    const created = await WikiArticleFavorite.create({ user_id: actor.id, article_id: Number(article_id) });
    return created;
  }

  static async removeFavorite(article_id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!article_id || Number.isNaN(Number(article_id))) { const err = new Error('Invalid article id'); err.statusCode = 400; throw err; }
    const ok = await WikiArticleFavorite.deleteByUserAndArticle(actor.id, Number(article_id));
    if (!ok) { const err = new Error('Favorite not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = WikiArticleFavoritesService;
