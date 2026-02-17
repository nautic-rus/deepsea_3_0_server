const Document = require('../../db/models/Document');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');
const HistoryService = require('./historyService');
const DocumentMessage = require('../../db/models/DocumentMessage');
const UserNotification = require('../../db/models/UserNotification');
const DocumentStorage = require('../../db/models/DocumentStorage');
const Storage = require('../../db/models/Storage');

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
    if (canViewAll) {
      const rows = await Document.list(query);
      await DocumentsService.attachDisplayFieldsToList(rows);
      return rows;
    }

    // Otherwise restrict results to projects the actor is assigned to.
  const Project = require('../../db/models/Project');
  const allowedProjectIds = await Project.listAssignedProjectIds(actor.id);
    // If user isn't assigned to any project, return empty list.
    if (!allowedProjectIds || allowedProjectIds.length === 0) return [];

    // If the query specifies a project_id that's not in user's projects, return empty set.
    if (query.project_id && !allowedProjectIds.includes(Number(query.project_id))) return [];

    // Pass allowedProjectIds to Document.list to enforce project restriction.
    const rows = await Document.list(query, allowedProjectIds);
    await DocumentsService.attachDisplayFieldsToList(rows);
    return rows;
  }

  /**
   * Attach display-friendly fields to documents list.
   * Adds: project_name, stage_name, stage_date, status_name, specialization_name, created_name
   */
  static async attachDisplayFieldsToList(docs) {
    if (!docs || !Array.isArray(docs) || docs.length === 0) return;
    try {
      const projectIds = [...new Set(docs.filter(d => d.project_id).map(d => d.project_id))];
      const stageIds = [...new Set(docs.filter(d => d.stage_id).map(d => d.stage_id))];
  const statusIds = [...new Set(docs.filter(d => d.status_id).map(d => d.status_id))];
  const specIds = [...new Set(docs.filter(d => d.specialization_id).map(d => d.specialization_id))];
  const creatorIds = [...new Set(docs.filter(d => d.created_by).map(d => d.created_by))];
  const assigneeIds = [...new Set(docs.filter(d => d.assigne_to).map(d => d.assigne_to))];

      const qProjects = projectIds.length ? pool.query(`SELECT id, name FROM projects WHERE id = ANY($1::int[])`, [projectIds]) : Promise.resolve({ rows: [] });
      const qStages = stageIds.length ? pool.query(`SELECT id, name, end_date FROM stages WHERE id = ANY($1::int[])`, [stageIds]) : Promise.resolve({ rows: [] });
      const qStatuses = statusIds.length ? pool.query(`SELECT id, name, code FROM issue_status WHERE id = ANY($1::int[])`, [statusIds]) : Promise.resolve({ rows: [] });
      const qSpecs = specIds.length ? pool.query(`SELECT id, name FROM specializations WHERE id = ANY($1::int[])`, [specIds]) : Promise.resolve({ rows: [] });

  // Fetch users for both creators and assignees (merge ids)
  const userIds = [...new Set([...(creatorIds || []), ...(assigneeIds || [])].map(n => Number(n)).filter(n => !Number.isNaN(n)))];
  const qUsers = userIds.length ? pool.query(`SELECT id, username, first_name, last_name, middle_name, email, avatar_id FROM users WHERE id = ANY($1::int[])`, [userIds]) : Promise.resolve({ rows: [] });

      const [projectsRes, stagesRes, statusesRes, specsRes, usersRes] = await Promise.all([qProjects, qStages, qStatuses, qSpecs, qUsers]);

      const projectMap = new Map((projectsRes.rows || []).map(r => [r.id, r]));
      const stageMap = new Map((stagesRes.rows || []).map(r => [r.id, r]));
      const statusMap = new Map((statusesRes.rows || []).map(r => [r.id, r]));
      const specMap = new Map((specsRes.rows || []).map(r => [r.id, r]));
      const userMap = new Map((usersRes.rows || []).map(r => [r.id, r]));

      const mkUserDisplay = (u) => {
        if (!u) return null;
        const parts = [];
        if (u.last_name) parts.push(u.last_name);
        if (u.first_name) parts.push(u.first_name);
        if (u.middle_name) parts.push(u.middle_name);
        const byName = parts.length ? parts.join(' ') : null;
        return byName || u.username || u.email || null;
      };

      for (const it of docs) {
        const proj = it.project_id ? projectMap.get(it.project_id) : null;
        it.project_name = proj ? proj.name || null : null;

        const st = it.stage_id ? stageMap.get(it.stage_id) : null;
        it.stage_name = st ? st.name : null;
        it.stage_date = st ? st.end_date : null;

        const stat = it.status_id ? statusMap.get(it.status_id) : null;
        it.status_name = stat ? stat.name : null;

        const sp = it.specialization_id ? specMap.get(it.specialization_id) : null;
        it.specialization_name = sp ? sp.name : null;

  const creator = it.created_by ? userMap.get(it.created_by) : null;
  it.created_name = mkUserDisplay(creator);
  it.created_avatar_id = creator && creator.avatar_id ? creator.avatar_id : null;

  const assignee = it.assigne_to ? userMap.get(it.assigne_to) : null;
  it.assigne_name = mkUserDisplay(assignee);
  it.assigne_avatar_id = assignee && assignee.avatar_id ? assignee.avatar_id : null;
      }
    } catch (e) {
      console.error('Failed to attach display fields to documents list', e && e.message ? e.message : e);
    }
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
    const created = await Document.create(fields);
    // Record creation in history (fire-and-forget) - write per-field entries
    (async () => {
      try {
        await HistoryService.addDocumentHistory(created.id, actor, 'created', { before: {}, after: created });
      } catch (e) { console.error('Failed to write document history for creation', e && e.message ? e.message : e); }
    })();
    return created;
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
    // Record update in history
    (async () => {
      try {
        await HistoryService.addDocumentHistory(Number(id), actor, 'updated', { before: existing, after: updated });
      } catch (e) { console.error('Failed to write document history for update', e && e.message ? e.message : e); }
    })();
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
    // Record deletion in history (soft-delete -> is_active=false)
    (async () => {
      try {
        const after = Object.assign({}, existing, { is_active: false });
        await HistoryService.addDocumentHistory(Number(id), actor, 'deleted', { before: existing, after });
      } catch (e) { console.error('Failed to write document history for deletion', e && e.message ? e.message : e); }
    })();
    return { success: true };
  }

  /**
   * Add a message/comment to a document.
   * @param {number} id - document id
   * @param {string} content - message content
   * @param {Object} actor - user performing the action
   */
  static async addDocumentMessage(id, content, actor) {
    const requiredPermission = 'documents.comment';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.comment'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }

    // Ensure actor is assigned to project unless they have view_all
    const canViewAll = await hasPermission(actor, 'documents.view_all');
    if (!canViewAll && existing.project_id) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    if (!content || String(content).trim().length === 0) { const err = new Error('Empty content'); err.statusCode = 400; throw err; }

    const created = await DocumentMessage.create({ document_id: Number(id), user_id: actor.id, content: String(content) });

    // Record history
    (async () => {
      try {
        await HistoryService.addDocumentHistory(Number(id), actor, 'commented', { before: {}, after: { comment: created.content } });
      } catch (e) { console.error('Failed to write document history for comment', e && e.message ? e.message : e); }
    })();

    // Notify document author/owner if present
    (async () => {
      try {
        const recipients = [];
        if (existing.created_by && existing.created_by !== actor.id) recipients.push(existing.created_by);
        for (const uid of recipients) {
          try {
            await UserNotification.create({ user_id: uid, event_code: 'comment_added', project_id: existing.project_id, data: { document_id: existing.id, message: created } });
          } catch (e) { console.error('Failed to create user notification for document comment', e && e.message ? e.message : e); }
        }
      } catch (e) { console.error('Failed to enqueue notifications for document comment', e && e.message ? e.message : e); }
    })();

    return created;
  }

  static async attachFileToDocument(id, storageId, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId || Number.isNaN(Number(storageId))) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }

    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    const storageItem = await Storage.findById(Number(storageId));
    if (!storageItem) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }

    const canUpdateAll = await hasPermission(actor, 'documents.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    const attached = await DocumentStorage.attach({ document_id: Number(id), storage_id: Number(storageId) });
    (async () => {
      try {
        await HistoryService.addDocumentHistory(Number(id), actor, 'file_attached', { before: {}, after: { storage_id: storageId } });
      } catch (e) { console.error('Failed to write document history for file attach', e && e.message ? e.message : e); }
    })();
    return attached;
  }

  static async detachFileFromDocument(id, storageId, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId || Number.isNaN(Number(storageId))) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }
    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    const detached = await DocumentStorage.detach({ document_id: Number(id), storage_id: Number(storageId) });
    (async () => {
      try {
        await HistoryService.addDocumentHistory(Number(id), actor, 'file_detached', { before: {}, after: { storage_id: storageId } });
      } catch (e) { console.error('Failed to write document history for file detach', e && e.message ? e.message : e); }
    })();
    // Attempt to delete storage object + DB record. Don't block the detach if deletion fails.
    (async () => {
      try {
        const StorageService = require('./storageService');
        try {
          await StorageService.deleteStorage(Number(storageId), actor);
        } catch (e) {
          console.error('Failed to delete storage after document detach', e && e.message ? e.message : e);
        }
      } catch (e) { console.error('Failed to run post-detach storage cleanup', e && e.message ? e.message : e); }
    })();
    return detached;
  }

  static async listDocumentFiles(id, opts = {}, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    return await DocumentStorage.listByDocument(Number(id), opts);
  }

  /**
   * List document directories (flat list). Requires documents.view permission.
   */
  static async listDirectories(actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    const DocumentDirectory = require('../../db/models/DocumentDirectory');
    // If user has global view permission or can view all projects, return all directories
    const canViewAll = await hasPermission(actor, 'documents.view_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    if (canViewAll || canViewAllProjects) return await DocumentDirectory.list();

    // Otherwise restrict directories to those without a project or belonging to projects
    // the actor is assigned to.
    const Project = require('../../db/models/Project');
    const allowedProjectIds = await Project.listAssignedProjectIds(actor.id);
    const rows = await DocumentDirectory.list();
    if (!allowedProjectIds || allowedProjectIds.length === 0) {
      // return only global (project_id IS NULL) directories
      return rows.filter(r => r.project_id === null || r.project_id === undefined);
    }
    const allowedSet = new Set(allowedProjectIds.map(n => Number(n)));
    return rows.filter(r => (r.project_id === null || r.project_id === undefined) || allowedSet.has(Number(r.project_id)));
  }

  static async createDirectory(fields, actor) {
    const requiredPermission = 'documents.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing required field: name'); err.statusCode = 400; throw err; }
    const DocumentDirectory = require('../../db/models/DocumentDirectory');
    // attach creator metadata
    fields.created_by = actor.id;
    fields.updated_by = actor.id;
    const created = await DocumentDirectory.create(fields);
    return created;
  }

  static async updateDirectory(id, fields, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const DocumentDirectory = require('../../db/models/DocumentDirectory');
    // attach updater metadata
    (fields = fields || {}).updated_by = actor.id;
    const updated = await DocumentDirectory.update(Number(id), fields);
    if (!updated) { const err = new Error('Directory not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteDirectory(id, actor) {
    const requiredPermission = 'documents.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const DocumentDirectory = require('../../db/models/DocumentDirectory');
    // attempt to mark as deleted; record updater if possible
  const ok = await DocumentDirectory.softDelete(Number(id), actor.id);
    if (!ok) { const err = new Error('Directory not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = DocumentsService;
