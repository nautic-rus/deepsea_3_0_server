const Document = require('../../db/models/Document');
const { hasPermission } = require('./permissionChecker');

/**
 * DocumentsService
 *
 * Handles document business logic, permission checks and delegates persistence
 * to the Document model.
 */
class DocumentsService {
  static async listDocuments(query = {}, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    // If actor has global view permission, return all matches per query.
    const canViewAll = await hasPermission(actor, 'documents.view_all');
    if (canViewAll) return await Document.list(query);

    // Otherwise restrict results to projects the actor is assigned to.
  const Project = require('../../db/models/Project');
  const allowedProjectIds = await Project.listAssignedProjectIds(actor.id);
    // If user isn't assigned to any project, return empty list.
    if (!allowedProjectIds || allowedProjectIds.length === 0) return [];

    // If the query specifies a project_id that's not in user's projects, return empty set.
    if (query.project_id && !allowedProjectIds.includes(Number(query.project_id))) return [];

    // Pass allowedProjectIds to Document.list to enforce project restriction.
    return await Document.list(query, allowedProjectIds);
  }

  static async getDocumentById(id, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const d = await Document.findById(Number(id));
    if (!d) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    // Ensure actor belongs to the document's project unless they have view_all
    const canViewAll = await hasPermission(actor, 'documents.view_all');
    if (!canViewAll) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(d.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }
    return d;
  }

  static async createDocument(fields, actor) {
    const requiredPermission = 'documents.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.title || !fields.project_id) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }

    // Ensure actor is allowed to create documents in the target project
    const canCreateAll = await hasPermission(actor, 'documents.create_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    const Project = require('../../db/models/Project');
    const project = await Project.findById(Number(fields.project_id));
    if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    if (!canCreateAll && !canViewAllProjects && project.owner_id !== actor.id) {
      const assigned = await Project.isUserAssigned(project.id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to target project'); err.statusCode = 403; throw err; }
    }

    if (!fields.created_by) fields.created_by = actor.id;
    return await Document.create(fields);
  }

  static async updateDocument(id, fields, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Ensure actor belongs to the document's project (unless they have elevated permission)
    const canUpdateAll = await hasPermission(actor, 'documents.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned && existing.project_id !== null && existing.project_id !== undefined && existing.project_id !== actor.id) {
        if (existing.project_id !== actor.id) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
      }
    }

    const updated = await Document.update(Number(id), fields);
    if (!updated) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteDocument(id, actor) {
    const requiredPermission = 'documents.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Ensure actor is assigned to the document's project unless they have elevated permission
    const canDeleteAll = await hasPermission(actor, 'documents.delete_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    if (!canDeleteAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned && existing.project_id !== actor.id) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    const ok = await Document.softDelete(Number(id));
    if (!ok) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = DocumentsService;
