const RolesService = require('../services/rolesService');

class RolesController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await RolesService.listRoles(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await RolesService.getRole(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await RolesService.createRole(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await RolesService.updateRole(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await RolesService.deleteRole(id, actor);
      res.json({ message: 'Role deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = RolesController;

