/**
 * Permission checker for RBAC
 * Exports hasPermission(actor, permissionCode)
 *
 * Logic:
 * - If actor has `permissions` array, check in-memory
 * - Otherwise perform a quick SQL query via Permission.hasPermissionForUser
 */

const Permission = require('../../db/models/Permission');

async function hasPermission(actor, permissionCode) {
  if (!actor || !actor.id) return false;

  if (actor.permissions && Array.isArray(actor.permissions)) {
    return actor.permissions.includes(permissionCode);
  }

  try {
    return await Permission.hasPermissionForUser(actor.id, permissionCode);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('permissionChecker.hasPermission error:', err.message);
    return false;
  }
}

module.exports = { hasPermission };
