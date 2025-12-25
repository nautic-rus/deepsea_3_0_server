const Role = require('../../db/models/Role');

const { hasPermission } = require('./permissionService');

class RolesService {
  static async listRoles(actor) {
    const requiredPermission = 'roles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.view'); err.statusCode = 403; throw err; }
    return await Role.list();
  }

  static async getRole(id, actor) {
    const requiredPermission = 'roles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const r = await Role.findById(Number(id));
    if (!r) { const err = new Error('Role not found'); err.statusCode = 404; throw err; }
    return r;
  }

  static async createRole(fields, actor) {
    const requiredPermission = 'roles.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing role name'); err.statusCode = 400; throw err; }
    return await Role.create({ name: fields.name, description: fields.description || null });
  }

  static async updateRole(id, fields, actor) {
    const requiredPermission = 'roles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Role.update(Number(id), fields);
    if (!updated) { const err = new Error('Role not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteRole(id, actor) {
    const requiredPermission = 'roles.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Role.softDelete(Number(id));
    if (!ok) { const err = new Error('Role not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = RolesService;
