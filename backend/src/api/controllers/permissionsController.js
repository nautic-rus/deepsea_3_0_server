const PermissionsService = require('../services/permissionsService');

/**
 * PermissionsController
 *
 * Simple controller exposing permission listing endpoints.
 */
class PermissionsController {
  /**
   * List all permissions visible to the actor.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await PermissionsService.listPermissions(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Create a new permission.
   * POST /api/permissions
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const payload = req.body || {};
      const created = await PermissionsService.createPermission(actor, payload);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Update permission by id
   * PUT /api/permissions/:id
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const fields = req.body || {};
      const updated = await PermissionsService.updatePermission(actor, id, fields);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Delete permission by id
   * DELETE /api/permissions/:id
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await PermissionsService.deletePermission(actor, id);
      res.json({ message: 'Permission deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = PermissionsController;
