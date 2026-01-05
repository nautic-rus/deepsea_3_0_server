const Project = require('../../db/models/Project');
const Role = require('../../db/models/Role');
const UserRole = require('../../db/models/UserRole');
const { hasPermission } = require('./permissionChecker');

/**
 * ProjectsService
 *
 * Service layer for project management. Applies permission checks and uses
 * Project and UserProject models for persistence and assignment logic.
 */
class ProjectsService {
  static async listProjects(query = {}, actor) {
    const requiredPermission = 'projects.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.view'); err.statusCode = 403; throw err; }
    // If actor has global view-all permission, return all projects
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    if (canViewAll) return await Project.list(query);

  // Otherwise return only projects assigned to this user via project-scoped roles
  return await Project.listForUser(actor.id, query);
  }

  static async getProjectById(id, actor) {
    const requiredPermission = 'projects.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const p = await Project.findById(Number(id));
    if (!p) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    // If actor has view_all permission, allow access; otherwise require user-project assignment
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    if (canViewAll) return p;
    const assigned = await Project.isUserAssigned(Number(id), actor.id);
    if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    return p;
  }

  static async createProject(fields, actor) {
    const requiredPermission = 'projects.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing project name'); err.statusCode = 400; throw err; }
    // Set current actor as owner if owner_id not explicitly provided
    const ownerId = (fields.owner_id && Number(fields.owner_id)) ? Number(fields.owner_id) : actor.id;
    const created = await Project.create({ name: fields.name, description: fields.description || null, code: fields.code || null, owner_id: ownerId });

    // Create a project-scoped owner role and assign the actor to it
    try {
      // Create or get a global 'owner' role and assign it scoped to the created project via user_roles
      const ownerRole = await Role.findOrCreate({ name: 'owner', description: 'Project owner' });
      await UserRole.assign(actor.id, ownerRole.id, created.id);
    } catch (e) {
      console.error('Failed to assign owner role to project creator:', e && e.message || e);
    }

    return created;
  }

  static async updateProject(id, fields, actor) {
    const requiredPermission = 'projects.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Project.update(Number(id), fields);
    if (!updated) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteProject(id, actor) {
    const requiredPermission = 'projects.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Project.softDelete(Number(id));
    if (!ok) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = ProjectsService;
