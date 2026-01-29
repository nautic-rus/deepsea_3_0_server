const UserRole = require('../../db/models/UserRole');
const Role = require('../../db/models/Role');
const Project = require('../../db/models/Project');
const { hasPermission } = require('./permissionChecker');

/**
 * UserProjectsService
 *
 * Manages assignments between users and projects. Enforces permissions and
 * uses UserProject/Project models for persistence and checks.
 */
class UserProjectsService {
  // List role assignments for a project (returns array of rows from user_roles joined with users/roles)
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

    const q = `SELECT ur.id, ur.user_id, ur.project_id, ur.role_id, r.name AS role_name,
      u.first_name, u.last_name, u.middle_name,
      concat_ws(' ', u.last_name, u.first_name, u.middle_name) AS full_name,
      ur.created_at
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE ur.project_id = $1
      ORDER BY ur.created_at DESC`;
    const res = await require('../../db/connection').query(q, [projectId]);
    return res.rows;
  }

  // Assign a user to a project by creating/using a project-scoped role (actor must have permission or be owner)
  static async assignToProject(projectId, userId, actor, roles = null) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    // Allow if actor has projects.assign OR is project owner OR has projects.view_all
    const canAssign = await hasPermission(actor, 'projects.assign');
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    const project = await Project.findById(projectId);
    if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    if (!canAssign && !canViewAll && project.owner_id !== actor.id) {
      const err = new Error('Forbidden: missing permission to assign users to project'); err.statusCode = 403; throw err; }
    // Normalize roles: accepts role ids (numbers) or role names (strings). If not provided, default to ['member'] by name.
    let normalized = [];
    if (!roles) normalized = [{ name: 'member' }];
    else {
      const arr = Array.isArray(roles) ? roles : [roles];
      for (const r of arr) {
        if (r === null || r === undefined) continue;
        // if it's a number or numeric string, treat as role id
        if (typeof r === 'number' || (typeof r === 'string' && /^\d+$/.test(r.trim()))) {
          const id = Number(r);
          const roleById = await Role.findById(id);
          if (roleById) normalized.push({ id: roleById.id, name: roleById.name });
          // if role id not found, skip
        } else {
          const name = String(r).trim();
          if (name) normalized.push({ name });
        }
      }
    }

    if (normalized.length === 0) normalized = [{ name: 'member' }];

    const results = [];
    for (const item of normalized) {
      let roleObj = null;
      if (item.id) {
        roleObj = await Role.findById(item.id);
        if (!roleObj) continue;
      } else {
        roleObj = await Role.findOrCreate({ name: item.name, description: `Project role: ${item.name}` });
      }
      const assigned = await UserRole.assign(userId, roleObj.id, projectId);
      if (assigned) results.push(assigned);
    }
    return results;
  }

  static async unassignFromProject(projectId, userId, actor, roles = null) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const canAssign = await hasPermission(actor, 'projects.assign');
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    const project = await Project.findById(projectId);
    if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    if (!canAssign && !canViewAll && project.owner_id !== actor.id) {
      const err = new Error('Forbidden: missing permission to unassign users from project'); err.statusCode = 403; throw err; }

    // If roles is null, remove all assignments for the user in the project
    if (!roles) {
      return await UserRole.unassignByUserAndProject(userId, projectId);
    }

    // Normalize roles list: accepts role ids (numbers) or role names (strings)
    const arr = Array.isArray(roles) ? roles : [roles];
    const roleKeys = [];
    for (const r of arr) {
      if (r === null || r === undefined) continue;
      if (typeof r === 'number' || (typeof r === 'string' && /^\d+$/.test(String(r).trim()))) {
        roleKeys.push({ id: Number(r) });
      } else {
        roleKeys.push({ name: String(r).trim() });
      }
    }
    if (roleKeys.length === 0) return false;

    let anyRemoved = false;
    for (const rk of roleKeys) {
      let roleObj = null;
      if (rk.id) {
        roleObj = await Role.findById(rk.id);
        if (!roleObj) continue; // nothing to remove
      } else {
        roleObj = await Role.findByName(rk.name);
        if (!roleObj) continue;
      }
      const removed = await UserRole.unassign(userId, roleObj.id, projectId);
      if (removed) anyRemoved = true;
    }
    return anyRemoved;
  }
}

module.exports = UserProjectsService;
