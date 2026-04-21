const WikiArticle = require('../../db/models/WikiArticle');
const WikiArticleView = require('../../db/models/WikiArticleView');
const { hasPermission } = require('./permissionChecker');

class WikiArticlesService {
  static async listArticles(query = {}, actor) {
    const requiredPermission = 'wiki.articles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.view'); err.statusCode = 403; throw err; }
    // normalize organization filters: allow organization_id or organization_ids (CSV or array)
    const q = Object.assign({}, query);
    if (q.organization_id !== undefined) q.organization_id = Number(q.organization_id);
    if (q.organization_ids && typeof q.organization_ids === 'string') {
      q.organization_ids = q.organization_ids.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
    }
    // Pass viewer info so model can filter by user's organization (with exception for article author)
    q.viewer_id = actor.id;
    q.viewer_organization_id = actor.organization_id !== undefined ? actor.organization_id : null;
    return await WikiArticle.list(q);
  }

  static async getArticleById(id, actor) {
    const requiredPermission = 'wiki.articles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const a = await WikiArticle.findById(Number(id));
    if (!a) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
      // If article is attached to organizations, restrict access to:
      // - the article author, or
      // - users who belong to one of the attached organizations.
      // If `organizations` is null (join table missing) or empty, allow access.
      try {
        if (a.organizations && Array.isArray(a.organizations) && a.organizations.length > 0) {
          const orgIds = a.organizations.map((o) => o.id).filter((v) => v != null);
          const isAuthor = actor.id === a.created_by;
          const inOrg = actor.organization_id && orgIds.includes(actor.organization_id);
          if (!isAuthor && !inOrg) {
            const err = new Error('Forbidden: not member of article organization'); err.statusCode = 403; throw err;
          }
        }
      } catch (e) {
        // If anything goes wrong during org-checking, fail closed with forbidden
        if (e && e.statusCode === 403) throw e;
        const err = new Error('Forbidden: unable to verify organization membership'); err.statusCode = 403; throw err;
      }
    // Log view for authenticated user; ignore errors from logging
    if (actor && actor.id) {
      (async () => {
        try { await WikiArticleView.create({ user_id: actor.id, article_id: Number(id) }); } catch (e) { /* ignore */ }
      })();
    }
    return a;
  }

  static async createArticle(fields, actor) {
    const requiredPermission = 'wiki.articles.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.title || !fields.content || !fields.section_id) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
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
