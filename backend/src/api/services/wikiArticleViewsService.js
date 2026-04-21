const WikiArticleView = require('../../db/models/WikiArticleView');

class WikiArticleViewsService {
  static async listMyViews(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const limit = query.limit ? Number(query.limit) : 10;
    return await WikiArticleView.listRecentByUser(actor.id, limit);
  }
}

module.exports = WikiArticleViewsService;
