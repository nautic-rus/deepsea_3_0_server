const Permission = require('../../db/models/Permission');
const { hasPermission } = require('./permissionChecker');

/**
 * PermissionsService
 *
 * Handles listing and retrieval of system permissions with permission checks.
 */
class PermissionsService {
  static async listPermissions(actor) {
    const requiredPermission = 'permissions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission permissions.view'); err.statusCode = 403; throw err; }
    return await Permission.list();
  }

  /**
   * Create a new permission record. Requires 'permissions.create' permission.
   * Accepts an object: { name, code, description, resource, action } and returns created row.
   */
  static async createPermission(actor, payload) {
    const requiredPermission = 'permissions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission permissions.create'); err.statusCode = 403; throw err; }

    // Basic payload validation and whitelist fields
    if (!payload || !payload.code) { const err = new Error('Missing permission code'); err.statusCode = 400; throw err; }
    const createPayload = {
      name: payload.name || null,
      code: payload.code,
      description: payload.description || null
    };

    // Delegate to model (which validates uniqueness)
    const row = await Permission.create(createPayload);
    return row;
  }

  /**
   * Update an existing permission. Requires 'permissions.update'.
   * Returns updated row.
   */
  static async updatePermission(actor, id, fields) {
    const requiredPermission = 'permissions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission permissions.update'); err.statusCode = 403; throw err; }

    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) { const err = new Error('Invalid permission id'); err.statusCode = 400; throw err; }

    // Whitelist allowed fields
    const allowedFields = {};
    if (fields && Object.prototype.hasOwnProperty.call(fields, 'name')) allowedFields.name = fields.name;
    if (fields && Object.prototype.hasOwnProperty.call(fields, 'code')) allowedFields.code = fields.code;
    if (fields && Object.prototype.hasOwnProperty.call(fields, 'description')) allowedFields.description = fields.description;

    // Delegate to model; model will validate uniqueness of code
    const row = await Permission.update(Number(id), allowedFields);
    if (!row) { const err = new Error('Permission not found'); err.statusCode = 404; throw err; }
    return row;
  }

  /**
   * Delete an existing permission. Requires 'permissions.delete'.
   */
  static async deletePermission(actor, id) {
    const requiredPermission = 'permissions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission permissions.delete'); err.statusCode = 403; throw err; }

    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) { const err = new Error('Invalid permission id'); err.statusCode = 400; throw err; }

    const ok = await Permission.delete(Number(id));
    if (!ok) { const err = new Error('Permission not found'); err.statusCode = 404; throw err; }
    // Record audit log
    try {
      const AuditLog = require('../../db/models/AuditLog');
      await AuditLog.create({
        actor_id: actor.id,
        entity: 'permissions',
        entity_id: Number(id),
        action: 'delete',
        details: { by: actor.id }
      });
    } catch (e) {
      // Log but don't fail the API call if audit logging fails
      console.error('Failed to write audit log for permission delete', e && e.message ? e.message : e);
    }
    return { success: true };
  }
}

module.exports = PermissionsService;
