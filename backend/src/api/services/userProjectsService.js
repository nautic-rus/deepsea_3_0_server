const UserProject = require('../../db/models/UserProject');
const Project = require('../../db/models/Project');
const { hasPermission } = require('./permissionChecker');

/**
 * UserProjectsService
 *
 * Manages assignments between users and projects. Enforces permissions and
 * uses UserProject/Project models for persistence and checks.
 */
class UserProjectsService {
  // List assignments for a project (returns array of rows from user_projects)
  static async listByProject(projectId, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    // Require basic project view permission
    const allowed = await hasPermission(actor, 'projects.view');
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.view'); err.statusCode = 403; throw err; }

    // If not view_all, ensure actor is assigned to this project
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    if (!canViewAll) {
      const assigned = await Project.isUserAssigned(projectId, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    const q = `SELECT id, user_id, project_id, assigned_by, assigned_at FROM user_projects WHERE project_id = $1 ORDER BY assigned_at DESC`;
    const res = await require('../../db/connection').query(q, [projectId]);
    return res.rows;
  }

  // Assign a user to a project (actor must have permission or be owner)
  static async assignToProject(projectId, userId, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    // Allow if actor has projects.assign OR is project owner OR has projects.view_all
    const canAssign = await hasPermission(actor, 'projects.assign');
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    const project = await Project.findById(projectId);
    if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    if (!canAssign && !canViewAll && project.owner_id !== actor.id) {
      const err = new Error('Forbidden: missing permission to assign users to project'); err.statusCode = 403; throw err; }

    return await UserProject.assign(userId, projectId, actor.id);
  }

  static async unassignFromProject(projectId, userId, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const canAssign = await hasPermission(actor, 'projects.assign');
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    const project = await Project.findById(projectId);
    if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    if (!canAssign && !canViewAll && project.owner_id !== actor.id) {
      const err = new Error('Forbidden: missing permission to unassign users from project'); err.statusCode = 403; throw err; }

    return await UserProject.unassign(userId, projectId);
  }
}

module.exports = UserProjectsService;
