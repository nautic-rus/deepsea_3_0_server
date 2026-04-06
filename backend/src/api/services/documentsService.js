const Document = require('../../db/models/Document');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');
const NotificationDispatcher = require('./notificationDispatcher');
const HistoryService = require('./historyService');
const DocumentMessage = require('../../db/models/DocumentMessage');
const DocumentStorage = require('../../db/models/DocumentStorage');
const Storage = require('../../db/models/Storage');
const ProtectionService = require('./protectionService');

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
  const typeIds = [...new Set(docs.filter(d => d.type_id).map(d => d.type_id))];
  const specIds = [...new Set(docs.filter(d => d.specialization_id).map(d => d.specialization_id))];
  const creatorIds = [...new Set(docs.filter(d => d.created_by).map(d => d.created_by))];
  const assigneeIds = [...new Set(docs.filter(d => d.assigne_to).map(d => d.assigne_to))];

  const qProjects = projectIds.length ? pool.query(`SELECT id, name, code FROM projects WHERE id = ANY($1::int[])`, [projectIds]) : Promise.resolve({ rows: [] });
      const qStages = stageIds.length ? pool.query(`SELECT id, name, end_date FROM stages WHERE id = ANY($1::int[])`, [stageIds]) : Promise.resolve({ rows: [] });
  const qStatuses = statusIds.length ? pool.query(`SELECT id, name, code FROM document_status WHERE id = ANY($1::int[])`, [statusIds]) : Promise.resolve({ rows: [] });
  const qSpecs = specIds.length ? pool.query(`SELECT id, name FROM specializations WHERE id = ANY($1::int[])`, [specIds]) : Promise.resolve({ rows: [] });
  const qTypes = typeIds.length ? pool.query(`SELECT id, name, code FROM document_type WHERE id = ANY($1::int[])`, [typeIds]) : Promise.resolve({ rows: [] });

  // Fetch users for both creators and assignees (merge ids)
  const userIds = [...new Set([...(creatorIds || []), ...(assigneeIds || [])].map(n => Number(n)).filter(n => !Number.isNaN(n)))];
  const qUsers = userIds.length ? pool.query(`SELECT id, username, first_name, last_name, middle_name, email, avatar_id FROM users WHERE id = ANY($1::int[])`, [userIds]) : Promise.resolve({ rows: [] });

  const [projectsRes, stagesRes, statusesRes, specsRes, usersRes, typesRes] = await Promise.all([qProjects, qStages, qStatuses, qSpecs, qUsers, qTypes]);

      const projectMap = new Map((projectsRes.rows || []).map(r => [r.id, r]));
      const stageMap = new Map((stagesRes.rows || []).map(r => [r.id, r]));
      const statusMap = new Map((statusesRes.rows || []).map(r => [r.id, r]));
  const specMap = new Map((specsRes.rows || []).map(r => [r.id, r]));
  const typeMap = new Map((typesRes.rows || []).map(r => [r.id, r]));
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
  it.project_code = proj ? proj.code || null : null;

        const st = it.stage_id ? stageMap.get(it.stage_id) : null;
        it.stage_name = st ? st.name : null;
        it.stage_date = st ? st.end_date : null;

  const stat = it.status_id ? statusMap.get(it.status_id) : null;
  it.status_name = stat ? stat.name : null;
  it.status_code = stat ? stat.code : null;

  const sp = it.specialization_id ? specMap.get(it.specialization_id) : null;
  it.specialization_name = sp ? sp.name : null;

  const tp = it.type_id ? typeMap.get(it.type_id) : null;
  it.type_name = tp ? tp.name : null;
  it.type_code = tp ? tp.code : null;

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
  if (!d || d.is_active === false) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    // Ensure actor belongs to the document's project unless they have view_all
    const canViewAll = await hasPermission(actor, 'documents.view_all');
    if (!canViewAll) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(d.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }
    // Attach display-friendly fields (same as for listDocuments)
    // Compute allowed next statuses according to document_work_flow for this document
    try {
      if (d.status_id) {
        // If document has a type, prefer workflows defined for that type. Otherwise
        // fall back to global workflows (document_type_id IS NULL).
        let res;
        if (d.type_id) {
          const q = `SELECT s.id, s.name, s.code, s.color, s.is_final FROM document_work_flow wf JOIN document_status s ON s.id = wf.to_status_id WHERE wf.document_type_id = $1 AND wf.from_status_id = $2 AND wf.is_active = true AND (wf.project_id IS NULL OR wf.project_id = $3) AND (wf.required_permission IS NULL OR EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = $4 AND p.code = wf.required_permission AND (ur.project_id IS NULL OR ur.project_id = $3))) ORDER BY s.order_index`;
          res = await pool.query(q, [d.type_id, d.status_id, d.project_id, actor.id]);
        } else {
          const q = `SELECT s.id, s.name, s.code, s.color, s.is_final FROM document_work_flow wf JOIN document_status s ON s.id = wf.to_status_id WHERE wf.document_type_id IS NULL AND wf.from_status_id = $1 AND wf.is_active = true AND (wf.project_id IS NULL OR wf.project_id = $2) AND (wf.required_permission IS NULL OR EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = $3 AND p.code = wf.required_permission AND (ur.project_id IS NULL OR ur.project_id = $2))) ORDER BY s.order_index`;
          res = await pool.query(q, [d.status_id, d.project_id, actor.id]);
        }
        let allowedStatuses = res.rows || [];

        // Check for 'blocks' links similar to issues: if any linked document that blocks
        // this document is NOT in a final status, then disallow transitions that are final.
        try {
          const EntityLink = require('../../db/models/EntityLink');
          const blockingLinks = await EntityLink.find({ passive_type: 'document', passive_id: d.id, active_type: 'document', relation_type: 'blocks' });
          const otherIds = [];
          for (const l of (blockingLinks || [])) {
            if (!l) continue;
            if (l.active_id) otherIds.push(Number(l.active_id));
          }
          const uniqOther = [...new Set(otherIds.filter(Boolean))];
          if (uniqOther.length > 0) {
            const q2 = `SELECT doc.id, s.is_final FROM documents doc LEFT JOIN document_status s ON s.id = doc.status_id WHERE doc.id = ANY($1::int[])`;
            const res2 = await pool.query(q2, [uniqOther]);
            const blockedNotFinal = (res2.rows || []).some(r => !r.is_final);
            if (blockedNotFinal) {
              allowedStatuses = allowedStatuses.filter(s => !s.is_final);
            }
          }
        } catch (e) {
          console.error('Failed to evaluate blocks links for allowed_document_statuses', e && e.message ? e.message : e);
        }

        d.allowed_statuses = allowedStatuses;
      } else {
        d.allowed_statuses = [];
      }
    } catch (e) {
      console.error('Failed to load allowed document statuses', e && e.message ? e.message : e);
      d.allowed_statuses = [];
    }

    // Attach display-friendly fields (same as for listDocuments)
    try {
      await DocumentsService.attachDisplayFieldsToList([d]);
    } catch (e) {
      // attachDisplayFieldsToList handles its own errors, but be defensive
      console.error('Failed to attach display fields to document', e && e.message ? e.message : e);
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

    // If created_by isn't provided, set it to the actor
    if (!fields.created_by) fields.created_by = actor.id;

    // Validate comment length to avoid DB errors (varchar(40)). If present,
    // enforce max length 40.
    if (typeof fields.comment !== 'undefined' && fields.comment !== null) {
      if (String(fields.comment).length > 40) { const err = new Error('Field comment too long (max 40 chars)'); err.statusCode = 400; throw err; }
      // Normalize empty string to undefined so DB default / nullable behavior is consistent
      if (String(fields.comment).trim() === '') delete fields.comment;
    }

    // Do not send an explicit priority value to the DB when the client
    // hasn't provided one (or provided an empty/null value). If we pass
    // priority = null/'' the DB default will be overwritten with that
    // value. Remove the key so the DB can apply its default.
    if (typeof fields.priority === 'undefined' || fields.priority === null || String(fields.priority).trim() === '') {
      delete fields.priority;
    } else {
      // Ensure numeric priority when it's present
      const p = Number(fields.priority);
      if (!Number.isNaN(p)) fields.priority = p;
      else delete fields.priority; // invalid -> let DB default
    }

    const created = await Document.create(fields);
    // Intentionally do not write a history entry for document creation per request.

    // Notify: document_created
    {
      const frontendRoot = process.env.FRONTEND_URL || '';
      const documentUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/documents/${created.id}` : '';
      NotificationDispatcher.dispatch({
        eventCode: 'document_created',
        projectId: created.project_id,
        actor,
        entity: { id: created.id, code: 'document', title: created.title },
        content: { value: created },
        participantIds: [created.created_by, created.assigne_to],
        templateContext: { project: { id: created.project_id, code: (project && project.code) || null }, document: created, actor, documentUrl },
        fallbackText: `New document: ${created.title}`,
        fallbackSubject: `New document ${created.title}`
      });
    }

    // Notify: document_created_in_project
    {
      const prsRes = await pool.query('SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1', [created.project_id]);
      const projectParticipantIds = (prsRes.rows || []).map(r => Number(r.user_id)).filter(Boolean);
      const frontendRoot = process.env.FRONTEND_URL || '';
      const documentUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/documents/${created.id}` : '';
      NotificationDispatcher.dispatch({
        eventCode: 'document_created_in_project',
        projectId: created.project_id,
        actor,
        entity: { id: created.id, code: 'document', title: created.title },
        content: { value: created },
        participantIds: projectParticipantIds,
        templateContext: { project: { id: created.project_id, code: (project && project.code) || null }, document: created, actor, documentUrl },
        fallbackText: `New document: ${created.title}`,
        fallbackSubject: `New document ${created.title}`
      });
    }

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
  if (!existing || existing.is_active === false) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned && existing.project_id !== null && existing.project_id !== undefined && existing.project_id !== actor.id) {
        if (existing.project_id !== actor.id) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
      }
    }

    // Validate comment length before update to avoid DB errors (varchar(40)).
    if (typeof fields.comment !== 'undefined' && fields.comment !== null) {
      if (String(fields.comment).length > 40) { const err = new Error('Field comment too long (max 40 chars)'); err.statusCode = 400; throw err; }
      if (String(fields.comment).trim() === '') delete fields.comment;
    }

    const updated = await Document.update(Number(id), fields);
    if (!updated) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    // Record update in history
    (async () => {
      try {
        await HistoryService.addDocumentHistory(Number(id), actor, 'updated', { before: existing, after: updated });
      } catch (e) { console.error('Failed to write document history for update', e && e.message ? e.message : e); }
    })();
    // Notify: document_updated
    {
      const Project = require('../../db/models/Project');
      let _project = null;
      try { _project = await Project.findById(Number(updated.project_id)); } catch (e) { _project = null; }
      const frontendRoot = process.env.FRONTEND_URL || '';
      const documentUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/documents/${updated.id}` : '';
      const projCtx = { id: updated.project_id, code: (_project && _project.code) || null };
      NotificationDispatcher.dispatch({
        eventCode: 'document_updated',
        projectId: updated.project_id,
        actor,
        entity: { id: updated.id, code: 'document', title: updated.title },
        content: { before: existing, after: updated },
        participantIds: [updated.created_by, updated.assigne_to, existing.created_by, existing.assigne_to],
        templateContext: { project: projCtx, document: updated, actor, documentUrl, changes: { before: existing, after: updated } },
        fallbackText: `Document updated: ${updated.title}`,
        fallbackSubject: `Document updated ${updated.title}`
      });

      // Notify: document_updated_in_project
      const prsRes = await pool.query('SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1', [updated.project_id]);
      const projectParticipantIds = (prsRes.rows || []).map(r => Number(r.user_id)).filter(Boolean);
      NotificationDispatcher.dispatch({
        eventCode: 'document_updated_in_project',
        projectId: updated.project_id,
        actor,
        entity: { id: updated.id, code: 'document', title: updated.title },
        content: { before: existing, after: updated },
        participantIds: projectParticipantIds,
        templateContext: { project: projCtx, document: updated, actor, documentUrl, changes: { before: existing, after: updated } },
        fallbackText: `Document updated: ${updated.title}`,
        fallbackSubject: `Document updated ${updated.title}`
      });
    }

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
  if (!existing || existing.is_active === false) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
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
  static async addDocumentMessage(id, content, actor, parent_id = null) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

  const existing = await Document.findById(Number(id));
  if (!existing || existing.is_active === false) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }

    // Ensure actor is assigned to project unless they have view_all
    const canViewAll = await hasPermission(actor, 'documents.view_all');
    if (!canViewAll && existing.project_id) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    if (!content || String(content).trim().length === 0) { const err = new Error('Empty content'); err.statusCode = 400; throw err; }

    const created = await DocumentMessage.create({ document_id: Number(id), user_id: actor.id, content: String(content), parent_id: parent_id ? Number(parent_id) : null });

    // Intentionally not recording a history entry for comment creation per request.

    // Notify: comment_added (document)
    {
      const Project = require('../../db/models/Project');
      let _projForComment = null;
      try { _projForComment = await Project.findById(Number(existing.project_id)); } catch (e) { _projForComment = null; }
      const frontendRoot = process.env.FRONTEND_URL || '';
      const targetUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/documents/${existing.id}` : '';
      NotificationDispatcher.dispatch({
        eventCode: 'comment_added',
        projectId: existing.project_id,
        actor,
        entity: { id: existing.id, code: 'document', title: existing.title },
        content: { value: created.content },
        participantIds: [existing.created_by, existing.assigne_to],
        templateContext: { project: { id: existing.project_id, code: (_projForComment && _projForComment.code) || null }, targetType: 'Document', targetId: existing.id, targetTitle: existing.title, targetUrl, actor, message: created },
        fallbackText: `${existing.title}: new comment`,
        fallbackSubject: `New comment on document ${existing.title}`
      });
    }

    return created;
  }

  static async attachFileToDocument(id, storageId, actor, metadata = {}) {
    const requiredPermission = 'documents.upload_files';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || (storageId === undefined || storageId === null)) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }

    const existing = await Document.findById(Number(id));
    if (!existing || existing.is_active === false) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    // Normalize storage entries to array of objects: { storage_id, type_id, rev, archive, archive_data, user_id }
    let entries = [];
    if (Array.isArray(storageId)) {
      if (storageId.length === 0) { const err = new Error('Empty storage list'); err.statusCode = 400; throw err; }
      if (typeof storageId[0] === 'object' && storageId[0] !== null && storageId[0].storage_id !== undefined) {
        entries = storageId.map((e) => ({
          storage_id: Number(e.storage_id),
          type_id: typeof e.type_id !== 'undefined' ? e.type_id : metadata.type_id,
          rev: typeof e.rev !== 'undefined' ? e.rev : metadata.rev,
          archive: typeof e.archive !== 'undefined' ? e.archive : metadata.archive,
          archive_data: typeof e.archive_data !== 'undefined' ? e.archive_data : metadata.archive_data,
          user_id: typeof e.user_id !== 'undefined' ? e.user_id : metadata.user_id
        }));
      } else {
        entries = storageId.map((s) => ({ storage_id: Number(s), type_id: metadata.type_id, rev: metadata.rev, archive: metadata.archive, archive_data: metadata.archive_data, user_id: metadata.user_id }));
      }
    } else {
      entries = [{ storage_id: Number(storageId), type_id: metadata.type_id, rev: metadata.rev, archive: metadata.archive, archive_data: metadata.archive_data, user_id: metadata.user_id }];
    }
    const storageItems = [];
    for (const e of entries) {
      if (!e.storage_id || Number.isNaN(Number(e.storage_id))) { const err = new Error('Invalid storage id'); err.statusCode = 400; throw err; }
      const si = await Storage.findById(Number(e.storage_id));
      if (!si) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
      storageItems.push(si);
    }
    const canUpdateAll = await hasPermission(actor, 'documents.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

  // Attach entries to DocumentStorage, applying per-entry metadata
  const attachedArr = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const payload = {
      document_id: Number(id),
      storage_id: Number(e.storage_id),
      type_id: typeof e.type_id !== 'undefined' ? (e.type_id === null ? null : Number(e.type_id)) : undefined,
      rev: typeof e.rev !== 'undefined' ? (e.rev === null ? null : Number(e.rev)) : undefined,
      archive: typeof e.archive !== 'undefined' ? e.archive : undefined,
      archive_data: typeof e.archive_data !== 'undefined' ? e.archive_data : undefined,
      user_id: typeof e.user_id !== 'undefined' ? (e.user_id === null ? null : Number(e.user_id)) : undefined
    };
    // Ensure user_id is set to actor by default when not provided
    if (!payload.user_id && actor && actor.id) payload.user_id = actor.id;
    const attached = await DocumentStorage.attach(payload);
    if (attached) attachedArr.push(attached);
  }
    // Do not record a history entry for file attachment per request.
    // Notify: document_uploaded
    {
      const Project = require('../../db/models/Project');
      let _projForAttach = null;
      try { _projForAttach = await Project.findById(Number(existing.project_id)); } catch (e) { _projForAttach = null; }
      const frontendRoot = process.env.FRONTEND_URL || '';
      const documentUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/documents/${existing.id}` : '';
      const storage_item = storageItems[0] || null;
      NotificationDispatcher.dispatch({
        eventCode: 'document_uploaded',
        projectId: existing.project_id,
        actor,
        entity: { id: existing.id, code: 'document', title: existing.title },
        content: { value: (attachedArr && attachedArr.length === 1) ? attachedArr[0] : attachedArr },
        // Notify only document participants: author (created_by) and assignee (assigne_to)
        participantIds: [existing.created_by, existing.assigne_to],
        templateContext: {
          project: { id: existing.project_id, code: (_projForAttach && _projForAttach.code) || null },
          document: existing, actor, documentUrl,
          storage_items: storageItems, storage_item, storage_file_list: storageItems.map(s => s.file_name).join('\n')
        },
        fallbackText: `Document uploaded: ${existing.title}`,
        fallbackSubject: `Document uploaded ${existing.title}`
      });

      // Notify: document_uploaded_in_project
      const prsRes = await pool.query('SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1', [existing.project_id]);
      const projectParticipantIds = (prsRes.rows || []).map(r => Number(r.user_id)).filter(Boolean);
      NotificationDispatcher.dispatch({
        eventCode: 'document_uploaded_in_project',
        projectId: existing.project_id,
        actor,
        entity: { id: existing.id, code: 'document', title: existing.title },
        content: { value: (attachedArr && attachedArr.length === 1) ? attachedArr[0] : attachedArr },
        participantIds: projectParticipantIds,
        templateContext: {
          project: { id: existing.project_id, code: (_projForAttach && _projForAttach.code) || null },
          document: existing, actor, documentUrl,
          storage_items: storageItems, storage_item, storage_file_list: storageItems.map(s => s.file_name).join('\n')
        },
        fallbackText: `Document uploaded: ${existing.title}`,
        fallbackSubject: `Document uploaded ${existing.title}`
      });
    }

  // Return attached items. If single item was attached, return the object for
  // backward compatibility; otherwise return the array of attached objects.
  if (!attachedArr || attachedArr.length === 0) return null;
  return attachedArr.length === 1 ? attachedArr[0] : attachedArr;
  }

  static async detachFileFromDocument(id, storageId, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId || Number.isNaN(Number(storageId))) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }
  const existing = await Document.findById(Number(id));
  if (!existing || existing.is_active === false) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    // Retrieve storage item to capture filename for history
    const storageItem = await Storage.findById(Number(storageId));
    const detached = await DocumentStorage.detach({ document_id: Number(id), storage_id: Number(storageId) });
    (async () => {
      try {
        await HistoryService.addDocumentHistory(Number(id), actor, 'file_detached', { before: storageItem ? storageItem.file_name : null, after: null });
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

  /**
   * Update metadata for an attached file on a document.
   * @param {number} id - document id
   * @param {number} storageId - storage id
   * @param {Object} metadata - metadata fields to update (type_id, rev, user_id, archive, archive_data)
   * @param {Object} actor - user performing the action
   */
  static async updateFileMetadata(id, storageId, metadata = {}, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId || Number.isNaN(Number(storageId))) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }

    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }

    const canUpdateAll = await hasPermission(actor, 'documents.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    // Delegate to DocumentStorage.updateMetadata
    const updated = await DocumentStorage.updateMetadata({ document_id: Number(id), storage_id: Number(storageId), metadata });
    return updated;
  }

  static async listDocumentFiles(id, opts = {}, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    const existing = await Document.findById(Number(id));
    if (!existing) { const err = new Error('Document not found'); err.statusCode = 404; throw err; }
    const rows = await DocumentStorage.listByDocument(Number(id), opts);
    if (!rows || rows.length === 0) return [];

    // Normalize/shape rows: include file_name, type_name and nested user info
    return rows.map((r) => {
      const fullNameParts = [r.user_last_name, r.user_first_name, r.user_middle_name].filter(Boolean);
      const fullName = fullNameParts.length ? fullNameParts.join(' ') : (r.user_username || r.user_email || null);
      const user = r.user_id ? { id: r.user_id, full_name: fullName, username: r.user_username || null, email: r.user_email || null, avatar_id: r.user_avatar_id || null } : null;

      // Build output object
      const out = Object.assign({}, r, {
        file_name: r.file_name || null,
        mime_type: r.mime_type || null,
        file_size: r.file_size || null,
        type_name: r.type_name || null,
        user: user
      });

      // Remove raw user_* fields
      delete out.user_username; delete out.user_first_name; delete out.user_last_name; delete out.user_middle_name; delete out.user_email; delete out.user_avatar_id;
      return out;
    });
  }

  /**
   * List messages for a document
   */
  static async listDocumentMessages(id, opts = {}, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
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
    const { limit, offset = 0 } = opts || {};
    const messages = await DocumentMessage.listByDocument(Number(id), { limit: limit != null ? Number(limit) : undefined, offset: Number(offset) });
    if (!messages || messages.length === 0) return [];

    // Enrich messages with user display info (full_name, email, url_avatar)
    const userIds = [...new Set(messages.map(m => m.user_id).filter(Boolean))];
    let usersMap = new Map();
    if (userIds.length) {
      const res = await pool.query(`SELECT id, email, phone, avatar_id, first_name, last_name, middle_name, username FROM users WHERE id = ANY($1::int[])`, [userIds]);
      usersMap = new Map((res.rows || []).map(u => [u.id, u]));
    }

    return messages.map(m => {
      const u = usersMap.get(m.user_id) || null;
      const fullName = u ? [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ') : null;
      return Object.assign({}, m, { user: u ? { id: u.id, full_name: fullName || u.username || u.email, email: u.email, phone: u.phone, avatar_id: u.avatar_id } : null });
    });
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
      // preserve previous behavior: when user has no projects, only return global directories
      return rows.filter(r => r.project_id === null || r.project_id === undefined);
    }

    // Build set of project ids user is assigned to
    const allowedSet = new Set(allowedProjectIds.map(n => Number(n)));

    // If user has assigned projects, include directories that are either directly
    // bound to those projects OR are descendants (nested) of such directories.
    // Build a parent -> children map to traverse the tree of directories.
    const childrenMap = new Map();
    for (const r of rows) {
      const pid = r.parent_id === undefined ? null : r.parent_id;
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid).push(r);
    }

    // Start from directories whose project_id is in allowedSet and collect all descendants
    const rootIds = rows.filter(r => allowedSet.has(Number(r.project_id))).map(r => r.id);
    const includedIds = new Set(rootIds);
    const stack = [...rootIds];
    while (stack.length) {
      const cur = stack.pop();
      const kids = childrenMap.get(cur) || [];
      for (const c of kids) {
        if (!includedIds.has(c.id)) {
          includedIds.add(c.id);
          stack.push(c.id);
        }
      }
    }

    return rows.filter(r => includedIds.has(r.id));
  }

  /**
   * List all document types
   * Requires permission: documents.view
   */
  static async listTypes(actor, projectId) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    let res;
    if (typeof projectId !== 'undefined') {
      const q = 'SELECT * FROM document_type WHERE (project_id IS NULL OR project_id = $1) ORDER BY COALESCE(order_index, 0), id';
      res = await pool.query(q, [projectId]);
    } else {
      res = await pool.query('SELECT * FROM document_type ORDER BY COALESCE(order_index, 0), id');
    }
    return res.rows || [];
  }

  static async getTypeById(id, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const res = await pool.query('SELECT * FROM document_type WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async createType(fields, actor) {
    const requiredPermission = 'documents.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.code) { const err = new Error('Missing required fields: name, code'); err.statusCode = 400; throw err; }
    const cols = ['name','code','description','icon','color','order_index'];
    const vals = [fields.name, fields.code, fields.description || null, fields.icon || null, fields.color || null, fields.order_index || 0];
    if (fields.project_id !== undefined && fields.project_id !== null) {
      cols.push('project_id'); vals.push(Number(fields.project_id));
    }
    const q = `INSERT INTO document_type (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async updateType(id, fields, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','icon','color','order_index','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) {
      const r = await pool.query('SELECT * FROM document_type WHERE id = $1 LIMIT 1', [Number(id)]);
      return r.rows[0] || null;
    }
    const q = `UPDATE document_type SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async deleteType(id, actor) {
    const requiredPermission = 'documents.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Prevent deletion if type is used in documents or workflows
    const usedInDocs = await pool.query('SELECT 1 FROM documents WHERE document_type_id = $1 LIMIT 1', [Number(id)]);
    if (usedInDocs.rowCount > 0) {
      const err = new Error('Cannot delete document type: it is referenced by existing documents'); err.statusCode = 400; throw err;
    }
    const usedInWF = await pool.query('SELECT 1 FROM document_work_flow WHERE document_type_id = $1 LIMIT 1', [Number(id)]);
    if (usedInWF.rowCount > 0) {
      const err = new Error('Cannot delete document type: it is used in document_work_flow'); err.statusCode = 400; throw err;
    }

    await ProtectionService.assertNotProtected('document_type', Number(id));
    const res = await pool.query('DELETE FROM document_type WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }

  /**
   * List all documents_storage_type rows
   * Requires permission: documents.view
   */
  static async listStorageTypes(actor, projectId) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    let res;
    if (typeof projectId !== 'undefined') {
      const q = 'SELECT * FROM documents_storage_type WHERE (project_id IS NULL OR project_id = $1) ORDER BY name, id';
      res = await pool.query(q, [projectId]);
    } else {
      res = await pool.query('SELECT * FROM documents_storage_type ORDER BY name, id');
    }
    return res.rows || [];
  }

  static async getStorageTypeById(id, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const res = await pool.query('SELECT * FROM documents_storage_type WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async createStorageType(fields, actor) {
    const requiredPermission = 'documents.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing required field: name'); err.statusCode = 400; throw err; }
    const cols = ['name','code','description'];
    const vals = [fields.name, fields.code || null, fields.description || null];
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO documents_storage_type (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async updateStorageType(id, fields, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) {
      const r = await pool.query('SELECT * FROM documents_storage_type WHERE id = $1 LIMIT 1', [Number(id)]);
      return r.rows[0] || null;
    }
    const q = `UPDATE documents_storage_type SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async deleteStorageType(id, actor) {
    const requiredPermission = 'documents.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Prevent deletion if storage type is used in documents_storage
    const usedInDocsStorage = await pool.query('SELECT 1 FROM documents_storage WHERE type_id = $1 LIMIT 1', [Number(id)]);
    if (usedInDocsStorage.rowCount > 0) {
      const err = new Error('Cannot delete storage type: it is referenced by existing document storage entries'); err.statusCode = 400; throw err;
    }

    const res = await pool.query('DELETE FROM documents_storage_type WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }

  /**
   * List all document statuses
   * Requires permission: documents.view
   */
  static async listStatuses(actor, projectId) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    let res;
    if (typeof projectId !== 'undefined') {
      const q = 'SELECT * FROM document_status WHERE (project_id IS NULL OR project_id = $1) ORDER BY COALESCE(order_index, 0), id';
      res = await pool.query(q, [projectId]);
    } else {
      res = await pool.query('SELECT * FROM document_status ORDER BY COALESCE(order_index, 0), id');
    }
    return res.rows || [];
  }

  static async getStatusById(id, actor) {
    const requiredPermission = 'documents.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const res = await pool.query('SELECT * FROM document_status WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async createStatus(fields, actor) {
    const requiredPermission = 'documents.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.code) { const err = new Error('Missing required fields: name, code'); err.statusCode = 400; throw err; }
    const cols = ['name','code','description','color','is_initial','is_final','order_index'];
    const vals = [fields.name, fields.code, fields.description || null, fields.color || null, !!fields.is_initial, !!fields.is_final, fields.order_index || 0];
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO document_status (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async updateStatus(id, fields, actor) {
    const requiredPermission = 'documents.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','color','is_initial','is_final','order_index','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) {
      const r = await pool.query('SELECT * FROM document_status WHERE id = $1 LIMIT 1', [Number(id)]);
      return r.rows[0] || null;
    }
    const q = `UPDATE document_status SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async deleteStatus(id, actor) {
    const requiredPermission = 'documents.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission documents.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Prevent deletion if status is used in documents or workflows
    const usedInDocs = await pool.query('SELECT 1 FROM documents WHERE status_id = $1 LIMIT 1', [Number(id)]);
    if (usedInDocs.rowCount > 0) {
      const err = new Error('Cannot delete document status: it is referenced by existing documents'); err.statusCode = 400; throw err;
    }
    const usedInWF = await pool.query('SELECT 1 FROM document_work_flow WHERE from_status_id = $1 OR to_status_id = $1 LIMIT 1', [Number(id)]);
    if (usedInWF.rowCount > 0) {
      const err = new Error('Cannot delete document status: it is used in document_work_flow'); err.statusCode = 400; throw err;
    }

    await ProtectionService.assertNotProtected('document_status', Number(id));
    const res = await pool.query('DELETE FROM document_status WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
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
    // Before deleting, ensure there are no child directories or documents attached
    // Check for active child directories
    try {
      const childRes = await pool.query('SELECT id FROM document_directories WHERE parent_id = $1 AND (is_active IS NULL OR is_active = true) LIMIT 1', [Number(id)]);
      if (childRes && childRes.rowCount > 0) { const err = new Error('Directory has child directories'); err.statusCode = 400; throw err; }
    } catch (e) {
      // If `is_active` column does not exist, retry without that condition.
      if (e && e.message && e.message.toLowerCase().includes('is_active')) {
        const childRes = await pool.query('SELECT id FROM document_directories WHERE parent_id = $1 LIMIT 1', [Number(id)]);
        if (childRes && childRes.rowCount > 0) { const err = new Error('Directory has child directories'); err.statusCode = 400; throw err; }
        // otherwise continue
      } else {
        // If the table doesn't exist or other error, rethrow
        if (e && e.statusCode) throw e; // our own
        throw e;
      }
    }
    // Check for documents attached to this directory
    try {
      const docsRes = await pool.query('SELECT id FROM documents WHERE directory_id = $1 AND (is_active IS NULL OR is_active = true) LIMIT 1', [Number(id)]);
      if (docsRes && docsRes.rowCount > 0) { const err = new Error('Directory contains documents'); err.statusCode = 400; throw err; }
    } catch (e) {
      // If `is_active` column does not exist on `documents`, retry without that condition.
      if (e && e.message && e.message.toLowerCase().includes('is_active')) {
        const docsRes = await pool.query('SELECT id FROM documents WHERE directory_id = $1 LIMIT 1', [Number(id)]);
        if (docsRes && docsRes.rowCount > 0) { const err = new Error('Directory contains documents'); err.statusCode = 400; throw err; }
      } else {
        if (e && e.statusCode) throw e;
        throw e;
      }
    }
    // attempt to mark as deleted; record updater if possible
    const ok = await DocumentDirectory.softDelete(Number(id), actor.id);
    if (!ok) { const err = new Error('Directory not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = DocumentsService;
