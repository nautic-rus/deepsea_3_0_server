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

  /**
   * Assign a permission to a role.
   * Expects numeric role id and permission id. Requires roles.update permission.
   */
  static async addPermissionToRole(roleId, permissionId, actor) {
    const requiredPermission = 'roles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.update'); err.statusCode = 403; throw err; }
    if (!roleId || Number.isNaN(Number(roleId))) { const err = new Error('Invalid role id'); err.statusCode = 400; throw err; }
    if (!permissionId || Number.isNaN(Number(permissionId))) { const err = new Error('Invalid permission id'); err.statusCode = 400; throw err; }

    // ensure permission exists
    const Permission = require('../../db/models/Permission');
    const permRowQ = `SELECT id FROM permissions WHERE id = $1 LIMIT 1`;
    const permRes = await require('../../db/connection').query(permRowQ, [Number(permissionId)]);
    if (permRes.rowCount === 0) { const err = new Error('Permission not found'); err.statusCode = 404; throw err; }

    const RoleModel = require('../../db/models/Role');
    const insertedId = await RoleModel.addPermission(Number(roleId), Number(permissionId));

    // Audit log
    try {
      const AuditLog = require('../../db/models/AuditLog');
      await AuditLog.create({
        actor_id: actor.id,
        entity: 'role_permissions',
        entity_id: insertedId || null,
        action: insertedId ? 'create' : 'noop',
        details: { role_id: Number(roleId), permission_id: Number(permissionId) }
      });
    } catch (e) {
      console.error('Failed to write audit log for role permission add', e && e.message ? e.message : e);
    }

    return { created: !!insertedId };
  }

  /**
   * Remove a permission from a role.
   * Requires roles.update permission.
   */
  static async removePermissionFromRole(roleId, permissionId, actor) {
    const requiredPermission = 'roles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.update'); err.statusCode = 403; throw err; }
    if (!roleId || Number.isNaN(Number(roleId))) { const err = new Error('Invalid role id'); err.statusCode = 400; throw err; }
    if (!permissionId || Number.isNaN(Number(permissionId))) { const err = new Error('Invalid permission id'); err.statusCode = 400; throw err; }

    const RoleModel = require('../../db/models/Role');
    const removed = await RoleModel.removePermission(Number(roleId), Number(permissionId));

    // Audit log
    try {
      const AuditLog = require('../../db/models/AuditLog');
      await AuditLog.create({
        actor_id: actor.id,
        entity: 'role_permissions',
        entity_id: null,
        action: removed ? 'delete' : 'noop',
        details: { role_id: Number(roleId), permission_id: Number(permissionId) }
      });
    } catch (e) {
      console.error('Failed to write audit log for role permission remove', e && e.message ? e.message : e);
    }

    return { removed: !!removed };
  }
}

module.exports = RolesService;
