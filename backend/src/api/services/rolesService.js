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
   * Assign multiple permissions to a role.
   * Accepts an array of permission ids and returns per-id results.
   */
  static async addPermissionsToRole(roleId, permissionIds, actor) {
    const requiredPermission = 'roles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.update'); err.statusCode = 403; throw err; }
    if (!roleId || Number.isNaN(Number(roleId))) { const err = new Error('Invalid role id'); err.statusCode = 400; throw err; }
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) { const err = new Error('permission_ids must be a non-empty array'); err.statusCode = 400; throw err; }

    // normalize and dedupe ids
    const ids = Array.from(new Set(permissionIds.map(x => Number(x)).filter(x => Number.isFinite(x) && x > 0)));
    if (ids.length === 0) { const err = new Error('permission_ids contains no valid ids'); err.statusCode = 400; throw err; }

    const RoleModel = require('../../db/models/Role');
    const results = [];
    for (const pid of ids) {
      try {
        const insertedId = await RoleModel.addPermission(Number(roleId), Number(pid));
        results.push({ permission_id: pid, created: !!insertedId });
      } catch (e) {
        // don't fail whole operation on a single bad id; record error
        results.push({ permission_id: pid, created: false, error: e && e.message ? e.message : String(e) });
      }
    }

    // Audit log (single entry summarizing the bulk op)
    try {
      const AuditLog = require('../../db/models/AuditLog');
      await AuditLog.create({
        actor_id: actor.id,
        entity: 'role_permissions',
        entity_id: null,
        action: 'bulk_create',
        details: { role_id: Number(roleId), results }
      });
    } catch (e) {
      console.error('Failed to write audit log for role permission bulk add', e && e.message ? e.message : e);
    }

    const created_count = results.filter(r => r.created).length;
    return { results, created_count };
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

  /**
   * Assign one or more global roles to a user (project_id = NULL)
   * Accepts role ids (numbers) or role names (strings). Returns array of created assignments.
   */
  static async assignToUser(userId, actor, roles = null) {
    const requiredPermission = 'roles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.update'); err.statusCode = 403; throw err; }

    if (!userId || Number.isNaN(Number(userId)) || Number(userId) <= 0) { const err = new Error('Invalid user id'); err.statusCode = 400; throw err; }

    // Normalize roles similar to project assignment behavior
    // Accept only numeric role ids. If roles omitted, use 'member' role id (findOrCreate internally).
    const UserRole = require('../../db/models/UserRole');
    const results = [];
    let ids = [];
    if (!roles) {
      // find or create 'member' role and use its id
      const memberRole = await Role.findOrCreate({ name: 'member', description: 'Global role: member' });
      ids = [memberRole.id];
    } else {
      const arr = Array.isArray(roles) ? roles : [roles];
      for (const r of arr) {
        if (r === null || r === undefined) continue;
        if (typeof r === 'number' || (typeof r === 'string' && /^\d+$/.test(String(r).trim()))) {
          ids.push(Number(r));
        } else {
          const err = new Error('roles must be numeric role id(s)'); err.statusCode = 400; throw err;
        }
      }
    }

    if (ids.length === 0) { const err = new Error('No role_id provided'); err.statusCode = 400; throw err; }

    for (const rid of ids) {
      const roleObj = await Role.findById(rid);
      if (!roleObj) { const err = new Error(`Role not found: ${rid}`); err.statusCode = 404; throw err; }
      const assigned = await UserRole.assign(Number(userId), roleObj.id, null);
      if (assigned) results.push(assigned);
    }
    return results;
  }

  /**
   * Unassign one or more global roles from a user (project_id = NULL)
   * If `roles` is null, remove all global role assignments for the user.
   */
  static async unassignFromUser(userId, actor, roles = null) {
    const requiredPermission = 'roles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission roles.update'); err.statusCode = 403; throw err; }

    if (!userId || Number.isNaN(Number(userId)) || Number(userId) <= 0) { const err = new Error('Invalid user id'); err.statusCode = 400; throw err; }

    const pool = require('../../db/connection');
    const UserRole = require('../../db/models/UserRole');

    // If roles not provided, delete all global (project_id IS NULL) assignments for this user
    if (!roles) {
      const q = `DELETE FROM user_roles WHERE user_id = $1 AND project_id IS NULL`;
      const res = await pool.query(q, [Number(userId)]);
      return { removed_count: res.rowCount };
    }

    // Normalize roles list and remove specified assignments
    const arr = Array.isArray(roles) ? roles : [roles];
    const ids = [];
    for (const r of arr) {
      if (r === null || r === undefined) continue;
      if (typeof r === 'number' || (typeof r === 'string' && /^\d+$/.test(String(r).trim()))) ids.push(Number(r));
      else { const err = new Error('roles must be numeric role id(s)'); err.statusCode = 400; throw err; }
    }
    if (ids.length === 0) return { removed_count: 0 };

    let removed_count = 0;
    for (const rid of ids) {
      const roleObj = await Role.findById(rid);
      if (!roleObj) { const err = new Error(`Role not found: ${rid}`); err.statusCode = 404; throw err; }
      const removed = await UserRole.unassign(Number(userId), roleObj.id, null);
      if (removed) removed_count += 1;
    }
    return { removed_count };
  }
}

module.exports = RolesService;
