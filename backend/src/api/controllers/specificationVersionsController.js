const SpecificationVersion = require('../../db/models/SpecificationVersion');
const { hasPermission } = require('../services/permissionChecker');

class SpecificationVersionsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const allowed = await hasPermission(actor, 'specifications.view');
      if (!allowed) {
        const err = new Error('Forbidden: missing permission specifications.view');
        err.statusCode = 403;
        throw err;
      }
      const rows = await SpecificationVersion.list(req.query || {});
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const allowed = await hasPermission(actor, 'specifications.view');
      if (!allowed) {
        const err = new Error('Forbidden: missing permission specifications.view');
        err.statusCode = 403;
        throw err;
      }
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        const err = new Error('Invalid id');
        err.statusCode = 400;
        throw err;
      }
      const row = await SpecificationVersion.findById(id);
      if (!row) {
        const err = new Error('Specification version not found');
        err.statusCode = 404;
        throw err;
      }
      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SpecificationVersionsController;
