/**
 * Permission checker for RBAC
 * Exports hasPermission(actor, permissionCode)
 *
 * Logic:
 * - If actor has `permissions` array, check in-memory
 * - Otherwise perform a quick SQL query via Permission.hasPermissionForUser
 */

const Permission = require('../../db/models/Permission');

/**
 * Check whether an actor has a given permission code.
 *
 * Tries in-memory actor.permissions first, falls back to DB lookup.
 *
 * @param {Object} actor - Authenticated user object
 * @param {string} permissionCode - Permission code to check
 * @returns {Promise<boolean>} true if actor has permission
 */
async function hasPermission(actor, permissionCode) {
  if (!actor || !actor.id) return false;

  if (!permissionCode) return false;

  // If actor.permissions is present, perform a normalized, case-insensitive check.
  if (actor.permissions && Array.isArray(actor.permissions)) {
    const expected = String(permissionCode).trim().toLowerCase();
    return actor.permissions.some(p => p && String(p).trim().toLowerCase() === expected);
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
