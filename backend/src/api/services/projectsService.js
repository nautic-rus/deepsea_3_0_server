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
    // Return all projects to any user with projects.view permission.
    // Previously we limited this to projects assigned to the user unless they had projects.view_all;
    // requirement changed: remove assignment-based filtering.
    return await Project.list(query);
  }

  static async getProjectById(id, actor) {
    const requiredPermission = 'projects.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const p = await Project.findById(Number(id));
    if (!p) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    // Any user with projects.view permission may access project details; remove assignment check.
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

  // List projects assigned to a specific user (no permission checks here;
  // controller enforces authentication via middleware).
  static async listProjectsForUser(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const projects = await Project.listForUser(actor.id, query);
    // Attach participants for each project: id, full_name, email, phone, url_avatar
    const pool = require('../../db/connection');
    for (const p of projects) {
      try {
        const q = `SELECT u.id, u.email, u.phone, u.avatar_url,
          concat_ws(' ', u.last_name, u.first_name, u.middle_name) AS full_name
          FROM users u
          WHERE u.id IN (SELECT user_id FROM user_roles WHERE project_id = $1)
          ORDER BY u.last_name, u.first_name`;
        const res = await pool.query(q, [p.id]);
        p.participants = res.rows.map(r => ({ id: r.id, full_name: r.full_name, email: r.email, phone: r.phone, url_avatar: r.avatar_url }));
      } catch (e) {
        p.participants = [];
      }
    }
    return projects;
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
