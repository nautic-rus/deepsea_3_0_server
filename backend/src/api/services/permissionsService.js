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
}

module.exports = PermissionsService;
