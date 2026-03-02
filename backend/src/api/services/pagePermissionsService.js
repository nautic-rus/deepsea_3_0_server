const PagePermission = require('../../db/models/PagePermission');
const Page = require('../../db/models/Page');
const Permission = require('../../db/models/Permission');
const { hasPermission } = require('./permissionChecker');

class PagePermissionsService {
  static async list(query = {}, actor) {
    const requiredPermission = 'page_permissions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission page_permissions.view'); err.statusCode = 403; throw err; }
    if (query.page_id) return PagePermission.listByPage(Number(query.page_id));
    return PagePermission.listAll();
  }

  static async create(fields = {}, actor) {
    const requiredPermission = 'page_permissions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission page_permissions.create'); err.statusCode = 403; throw err; }
    const pageId = fields.page_id ? Number(fields.page_id) : null;
    const permissionId = fields.permission_id ? Number(fields.permission_id) : null;
    if (!pageId || !permissionId) { const err = new Error('page_id and permission_id required'); err.statusCode = 400; throw err; }
    // Validate page and permission exist
    const page = await Page.findById(pageId);
    if (!page) { const err = new Error('Page not found'); err.statusCode = 404; throw err; }
    const perm = await Permission.findById(permissionId);
    if (!perm) { const err = new Error('Permission not found'); err.statusCode = 404; throw err; }
    return PagePermission.create(pageId, permissionId);
  }

  static async delete(id, actor) {
    const requiredPermission = 'page_permissions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission page_permissions.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await PagePermission.delete(Number(id));
    if (!ok) { const err = new Error('Page permission not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = PagePermissionsService;
