const RolesService = require('../services/rolesService');

/**
 * RolesController
 *
 * Controller for managing roles and role-permission queries.
 */
class RolesController {
  /**
   * List roles visible to the actor.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await RolesService.listRoles(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Get a role by id.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await RolesService.getRole(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Create a role.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await RolesService.createRole(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update a role.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await RolesService.updateRole(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete a role.
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await RolesService.deleteRole(id, actor);
      res.json({ message: 'Role deleted' });
    } catch (err) { next(err); }
  }

  /**
   * Get permissions for a given role.
   */
  static async getPermissions(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const rows = await RolesService.getPermissionsByRole(id, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Assign a permission to a role (POST /roles/:id/permissions)
   * Body: { permission_id: number }
   */
  static async assignPermission(req, res, next) {
    try {
      const actor = req.user || null;
      const roleId = parseInt(req.params.id, 10);
      // Accept either single permission_id or an array permission_ids
      const body = req.body || {};
      if (Array.isArray(body.permission_ids)) {
        const ids = body.permission_ids.map(x => parseInt(x, 10)).filter(x => !Number.isNaN(x));
        const result = await RolesService.addPermissionsToRole(roleId, ids, actor);
        return res.status(201).json({ data: result });
      }
      const permissionId = body.permission_id ? parseInt(body.permission_id, 10) : null;
      const result = await RolesService.addPermissionToRole(roleId, permissionId, actor);
      res.status(201).json({ data: result });
    } catch (err) { next(err); }
  }

  /**
   * Unassign a permission from a role (DELETE /roles/:id/permissions/:permission_id)
   */
  static async unassignPermission(req, res, next) {
    try {
      const actor = req.user || null;
      const roleId = parseInt(req.params.id, 10);
      const permissionId = req.params.permission_id ? parseInt(req.params.permission_id, 10) : null;
      const result = await RolesService.removePermissionFromRole(roleId, permissionId, actor);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  // Fallback handler: accepts role_id via query string or uses actor's role
  /**
   * Get permissions by query parameter (role_id) or infer from actor.
   */
  static async getPermissionsByQuery(req, res, next) {
    try {
      const actor = req.user || null;
      const qid = req.query.role_id || req.query.id || null;
      const id = qid ? parseInt(qid, 10) : null;
      if (!id) {
        // Try to infer role id from actor (if user has single role)
        if (actor && actor.role_id) {
          const rows = await RolesService.getPermissionsByRole(actor.role_id, actor);
          return res.json({ data: rows });
        }
        return res.status(400).json({ error: 'role_id is required (provide as path param or ?role_id=)' });
      }
      const rows = await RolesService.getPermissionsByRole(id, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }
}

module.exports = RolesController;

