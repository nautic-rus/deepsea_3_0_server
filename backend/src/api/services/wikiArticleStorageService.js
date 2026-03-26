const WikiArticleStorage = require('../../db/models/WikiArticleStorage');
const { hasPermission } = require('./permissionChecker');

class WikiArticleStorageService {
  static async listStorage(query = {}, actor) {
    const requiredPermission = 'wiki.storage.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.storage.view'); err.statusCode = 403; throw err; }
    return await WikiArticleStorage.list(query);
  }

  static async getStorageById(id, actor) {
    const requiredPermission = 'wiki.storage.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.storage.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await WikiArticleStorage.findById(Number(id));
    if (!s) { const err = new Error('Record not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createStorage(fields, actor) {
    const requiredPermission = 'wiki.storage.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.storage.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.article_id || !fields.storage_id) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    return await WikiArticleStorage.create(fields);
  }

  static async deleteStorage(id, actor) {
    const requiredPermission = 'wiki.storage.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.storage.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await WikiArticleStorage.delete(Number(id));
    if (!ok) { const err = new Error('Record not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = WikiArticleStorageService;
