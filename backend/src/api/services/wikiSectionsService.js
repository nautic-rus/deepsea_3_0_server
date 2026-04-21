const WikiSection = require('../../db/models/WikiSection');
const Project = require('../../db/models/Project');
const { hasPermission } = require('./permissionChecker');

class WikiSectionsService {
  static async listSections(query = {}, actor) {
    const requiredPermission = 'wiki.sections.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.view'); err.statusCode = 403; throw err; }
    const q = Object.assign({}, query);
    // normalize project_id: allow 'null' string to mean sections without project
    if (q.project_id === 'null') q.project_id = 'null';
    else if (q.project_id !== undefined) q.project_id = Number(q.project_id);
    // If a specific project_id is requested — ensure actor is assigned to that project (or has global view_all)
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    if (q.project_id !== undefined && q.project_id !== null && q.project_id !== 'null' && q.project_id !== '') {
      const pid = Number(q.project_id);
      if (!canViewAll) {
        const assigned = await Project.isUserAssigned(pid, actor.id);
        if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
      }
      return await WikiSection.list(q);
    }

    // No specific project filter: fetch sections and then filter to projects the user belongs to
    const rows = await WikiSection.list(q);
    if (canViewAll) return rows;
    const assignedIds = await Project.listAssignedProjectIds(actor.id);
    return rows.filter(r => (r.project_id === null || assignedIds.includes(r.project_id)));
  }

  static async getSectionById(id, actor) {
    const requiredPermission = 'wiki.sections.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await WikiSection.findById(Number(id));
    if (!s) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    // If section is project-scoped, ensure actor belongs to that project (or has view_all)
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    if (s.project_id !== null && !canViewAll) {
      const assigned = await Project.isUserAssigned(s.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }
    return s;
  }

  static async createSection(fields, actor) {
    const requiredPermission = 'wiki.sections.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.slug) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.created_by) fields.created_by = actor.id;
    return await WikiSection.create(fields);
  }

  static async updateSection(id, fields, actor) {
    const requiredPermission = 'wiki.sections.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await WikiSection.update(Number(id), fields);
    if (!updated) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteSection(id, actor) {
    const requiredPermission = 'wiki.sections.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await WikiSection.softDelete(Number(id));
    if (!ok) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = WikiSectionsService;
