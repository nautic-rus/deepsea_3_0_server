const UserProjectsService = require('../services/userProjectsService');

class UserProjectsController {
  static async listByProject(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
      const rows = await UserProjectsService.listByProject(projectId, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async assign(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
  const userId = req.body.user_id || req.body.userId || null;
  if (!userId) { const err = new Error('user_id required'); err.statusCode = 400; throw err; }
  const row = await UserProjectsService.assignToProject(projectId, Number(userId), actor);
      res.status(201).json({ data: row });
    } catch (err) { next(err); }
  }

  static async unassign(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
      const userId = parseInt(req.params.userId || req.query.user_id, 10) || null;
      if (!userId) { const err = new Error('userId required'); err.statusCode = 400; throw err; }
      const ok = await UserProjectsService.unassignFromProject(projectId, userId, actor);
      res.json({ success: ok });
    } catch (err) { next(err); }
  }
}

module.exports = UserProjectsController;
