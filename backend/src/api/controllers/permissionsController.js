const PermissionsService = require('../services/permissionsService');

class PermissionsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await PermissionsService.listPermissions(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }
}

module.exports = PermissionsController;
