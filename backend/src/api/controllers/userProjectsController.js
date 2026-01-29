const UserProjectsService = require('../services/userProjectsService');

/**
 * UserProjectsController
 *
 * Controller for user-project assignment endpoints (list, assign, unassign).
 */
class UserProjectsController {
  /**
   * List assignments for a project.
   */
  static async listByProject(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
      const rows = await UserProjectsService.listByProject(projectId, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Assign a user to a project.
   */
  static async assign(req, res, next) {
    try {
      const actor = req.user || null;
      // Accept parameters from request body. Support backward-compatibility with params.id.
      const body = req.body || {};
      const projectId = body.project_id ? Number(body.project_id) : (req.params.id ? Number(req.params.id) : null);
      let userId = body.user_id || body.userId || null;
  // support single role_id (number) or multiple role ids (roles array), fallback to role name string for compatibility
  let roles = null;
  if (body.roles) roles = Array.isArray(body.roles) ? body.roles : [body.roles];
  else if (body.role) roles = Array.isArray(body.role) ? body.role : [body.role];
  // roles may be numbers (ids) or strings (names) — service will normalize
      if (!projectId) { const err = new Error('project_id required'); err.statusCode = 400; throw err; }
      if (!userId && userId !== 0) { const err = new Error('user_id required'); err.statusCode = 400; throw err; }

      // Support sending user_id as array to assign multiple users in one request.
      // Accepts: user_id: [1,2,3] or user_id: "1,2,3" (comma-separated string) or single id.
      const results = [];
      if (Array.isArray(userId)) {
        for (const u of userId) {
          if (u === null || u === undefined || u === '') continue;
          const uid = Number(u);
          const row = await UserProjectsService.assignToProject(Number(projectId), uid, actor, roles);
          if (row && row.length) results.push(...row);
        }
      } else if (typeof userId === 'string' && userId.indexOf(',') !== -1) {
        // allow comma-separated list in a string
        const parts = userId.split(',').map(s => s.trim()).filter(s => s !== '');
        for (const p of parts) {
          const uid = Number(p);
          const row = await UserProjectsService.assignToProject(Number(projectId), uid, actor, roles);
          if (row && row.length) results.push(...row);
        }
      } else {
        const uid = Number(userId);
        const row = await UserProjectsService.assignToProject(Number(projectId), uid, actor, roles);
        if (row && row.length) results.push(...row);
      }

      res.status(201).json({ data: results });
    } catch (err) { next(err); }
  }

  /**
   * Unassign a user from a project.
   */
  static async unassign(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = parseInt(req.params.id, 10);
      const body = req.body || {};
      // prefer body parameters (moved from path/query into request body)
      let userId = body.user_id || body.userId || (req.query.user_id ? req.query.user_id : null);
      if (!userId && userId !== 0) { const err = new Error('user_id required in request body'); err.statusCode = 400; throw err; }

      // support deleting a single user or multiple users (array or CSV string)
      // support deleting a single role_id/name (`role`) or multiple role ids/names (`roles`)
      let roles = null;
      if (body.roles) roles = Array.isArray(body.roles) ? body.roles : [body.roles];
      else if (body.role) roles = Array.isArray(body.role) ? body.role : [body.role];

      const results = [];
      if (Array.isArray(userId)) {
        for (const u of userId) {
          if (u === null || u === undefined || u === '') continue;
          const uid = Number(u);
          const ok = await UserProjectsService.unassignFromProject(projectId, uid, actor, roles);
          results.push({ user_id: uid, removed: !!ok });
        }
      } else if (typeof userId === 'string' && userId.indexOf(',') !== -1) {
        const parts = userId.split(',').map(s => s.trim()).filter(s => s !== '');
        for (const p of parts) {
          const uid = Number(p);
          const ok = await UserProjectsService.unassignFromProject(projectId, uid, actor, roles);
          results.push({ user_id: uid, removed: !!ok });
        }
      } else {
        const uid = Number(userId);
        const ok = await UserProjectsService.unassignFromProject(projectId, uid, actor, roles);
        results.push({ user_id: uid, removed: !!ok });
      }

      res.json({ success: true, results });
    } catch (err) { next(err); }
  }
}

module.exports = UserProjectsController;
