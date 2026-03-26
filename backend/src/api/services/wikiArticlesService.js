const WikiArticle = require('../../db/models/WikiArticle');
const { hasPermission } = require('./permissionChecker');

class WikiArticlesService {
  static async listArticles(query = {}, actor) {
    const requiredPermission = 'wiki.articles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.view'); err.statusCode = 403; throw err; }
    return await WikiArticle.list(query);
  }

  static async getArticleById(id, actor) {
    const requiredPermission = 'wiki.articles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const a = await WikiArticle.findById(Number(id));
    if (!a) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
    return a;
  }

  static async createArticle(fields, actor) {
    const requiredPermission = 'wiki.articles.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.title || !fields.slug || !fields.content || !fields.section_id) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await WikiArticle.create(fields);
  }

  static async updateArticle(id, fields, actor) {
    const requiredPermission = 'wiki.articles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await WikiArticle.update(Number(id), fields);
    if (!updated) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteArticle(id, actor) {
    const requiredPermission = 'wiki.articles.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await WikiArticle.softDelete(Number(id));
    if (!ok) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = WikiArticlesService;
