const Organization = require('../../db/models/Organization');
const { hasPermission } = require('./permissionChecker');

class OrganizationsService {
  static async listOrganizations(actor) {
    const requiredPermission = 'organizations.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission organizations.view'); err.statusCode = 403; throw err; }
    return Organization.list();
  }

  static async createOrganization(name, slug, description, actor) {
    const requiredPermission = 'organizations.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission organizations.create'); err.statusCode = 403; throw err; }
    if (!name || !name.trim()) { const err = new Error('Name required'); err.statusCode = 400; throw err; }
    return Organization.create(name.trim(), slug && typeof slug === 'string' ? slug.trim() : null, description && typeof description === 'string' ? description.trim() : null);
  }

  static async updateOrganization(id, fields, actor) {
    const requiredPermission = 'organizations.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission organizations.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) { const err = new Error('Invalid organization id'); err.statusCode = 400; throw err; }
    const updated = await Organization.update(Number(id), fields);
    if (!updated) { const err = new Error('Organization not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteOrganization(id, actor) {
    const requiredPermission = 'organizations.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission organizations.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) { const err = new Error('Invalid organization id'); err.statusCode = 400; throw err; }
    const ok = await Organization.softDelete(Number(id));
    if (!ok) { const err = new Error('Organization not found or could not be deleted'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = OrganizationsService;
