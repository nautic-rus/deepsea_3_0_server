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
}

module.exports = PermissionsController;
