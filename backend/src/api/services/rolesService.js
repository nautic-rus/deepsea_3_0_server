const Role = require('../../db/models/Role');

const { hasPermission } = require('./permissionChecker');

/**
 * RolesService
 *
 * Manages roles and role-related queries; verifies permissions before
 * delegating to the Role model.
 */
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
    const created = await Role.create({ name: fields.name, description: fields.description || null });
    // Audit log (non-blocking)
    try {
      const AuditLog = require('../../db/models/AuditLog');
      await AuditLog.create({
        actor_id: actor.id,
        entity: 'roles',
        entity_id: created.id,
        action: 'create',
        details: { name: created.name }
      });
    } catch (e) {
      console.error('Failed to write audit log for role create', e && e.message ? e.message : e);
    }
    return created;
  }

  static async updateRole(id, fields, actor) {
    const requiredPermission = 'roles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Role.update(Number(id), fields);
    if (!updated) { const err = new Error('Role not found'); err.statusCode = 404; throw err; }
    // Audit log (non-blocking)
    try {
      const AuditLog = require('../../db/models/AuditLog');
      await AuditLog.create({
        actor_id: actor.id,
        entity: 'roles',
        entity_id: updated.id,
        action: 'update',
        details: { fields }
      });
    } catch (e) {
      console.error('Failed to write audit log for role update', e && e.message ? e.message : e);
    }
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
    // Audit log (non-blocking)
    try {
      const AuditLog = require('../../db/models/AuditLog');
      await AuditLog.create({
        actor_id: actor.id,
        entity: 'roles',
        entity_id: Number(id),
        action: 'delete',
        details: { by: actor.id }
      });
    } catch (e) {
      console.error('Failed to write audit log for role delete', e && e.message ? e.message : e);
    }
    return { success: true };
  }

  static async getPermissionsByRole(id, actor) {
    const requiredPermission = 'roles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // lazy require to avoid cycles
    const Permission = require('../../db/models/Permission');
    return await Permission.listByRole(Number(id));
  }
}

module.exports = RolesService;
