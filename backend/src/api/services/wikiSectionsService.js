const WikiSection = require('../../db/models/WikiSection');
const { hasPermission } = require('./permissionChecker');

class WikiSectionsService {
  static async listSections(query = {}, actor) {
    const requiredPermission = 'wiki.sections.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.view'); err.statusCode = 403; throw err; }
    return await WikiSection.list(query);
  }

  static async getSectionById(id, actor) {
    const requiredPermission = 'wiki.sections.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await WikiSection.findById(Number(id));
    if (!s) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    return s;
  }

  static async createSection(fields, actor) {
    const requiredPermission = 'wiki.sections.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.slug) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await WikiSection.create(fields);
  }

  static async updateSection(id, fields, actor) {
    const requiredPermission = 'wiki.sections.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await WikiSection.update(Number(id), fields);
    if (!updated) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteSection(id, actor) {
    const requiredPermission = 'wiki.sections.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await WikiSection.softDelete(Number(id));
    if (!ok) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = WikiSectionsService;
