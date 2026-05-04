const pool = require('../../db/connection');
const CustomerQuestion = require('../../db/models/CustomerQuestion');
const CustomerQuestionStorage = require('../../db/models/CustomerQuestionStorage');
const Storage = require('../../db/models/Storage');
const { hasPermission, hasPermissionForProject, getPermissionProjectScope } = require('./permissionChecker');
const NotificationDispatcher = require('./notificationDispatcher');
const HistoryService = require('./historyService');
const ProtectionService = require('./protectionService');



class CustomerQuestionsService {
  static async listTypes(actor, projectId) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    let res;
    if (typeof projectId !== 'undefined') {
      const q = 'SELECT * FROM customer_question_type WHERE (project_id IS NULL OR project_id = $1) ORDER BY COALESCE(order_index, 0), id';
      res = await pool.query(q, [projectId]);
    } else {
      res = await pool.query('SELECT * FROM customer_question_type ORDER BY COALESCE(order_index, 0), id');
    }
    return res.rows || [];
  }

  static async createType(fields, actor) {
    const requiredPermission = 'customer_questions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.code) { const err = new Error('Missing required fields: name, code'); err.statusCode = 400; throw err; }
    const cols = ['name','code','description','color','order_index'];
    const vals = [fields.name, fields.code, fields.description || null, fields.color || null, fields.order_index || 0];
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO customer_question_type (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async updateType(id, fields, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','color','order_index','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) {
      const r = await pool.query('SELECT * FROM customer_question_type WHERE id = $1 LIMIT 1', [Number(id)]);
      return r.rows[0] || null;
    }
    const q = `UPDATE customer_question_type SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async deleteType(id, actor) {
    const requiredPermission = 'customer_questions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Prevent deletion if type is used in customer_questions
    const usedInQuestions = await pool.query('SELECT 1 FROM customer_questions WHERE type_id = $1 LIMIT 1', [Number(id)]);
    if (usedInQuestions.rowCount > 0) {
      const err = new Error('Cannot delete type: it is referenced by existing customer questions'); err.statusCode = 400; throw err;
    }
    await ProtectionService.assertNotProtected('customer_question_type', Number(id));
    const res = await pool.query('DELETE FROM customer_question_type WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
  static async listCustomerQuestions(query = {}, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const permissionScope = await getPermissionProjectScope(actor, requiredPermission);
    if (!permissionScope.hasGlobal && permissionScope.projectIds.length === 0) {
      const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err;
    }

    if (permissionScope.hasGlobal) {
      return CustomerQuestion.list(query);
    }

    const projectIds = permissionScope.projectIds;

    if (query.project_id !== undefined && query.project_id !== null) {
      const requestedProjectIds = Array.isArray(query.project_id)
        ? query.project_id.map(p => Number(p)).filter(p => !Number.isNaN(p))
        : [Number(query.project_id)].filter(p => !Number.isNaN(p));

      if (requestedProjectIds.length === 0) {
        const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
      }

      const forbiddenProject = requestedProjectIds.find(pid => !projectIds.includes(pid));
      if (forbiddenProject !== undefined) {
        const err = new Error('Forbidden: missing permission customer_questions.view for requested project'); err.statusCode = 403; throw err;
      }

      query.project_id = requestedProjectIds.length === 1 ? requestedProjectIds[0] : requestedProjectIds;
      return CustomerQuestion.list(query);
    }

    if (projectIds.length === 0) return [];
    const filters = Object.assign({}, query, { allowed_project_ids: projectIds });
    return CustomerQuestion.list(filters);
  }

  /**
   * Get customer questions statistics grouped by type and specialization.
   * Returns counts of open/closed questions and percent closed.
   * Supports filtering by project_id and respects permission/project scope.
   */
  static async getQuestionsStatistics(query = {}, actor) {
    const requiredPermission = 'customer_questions.statistics';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const permissionScope = getPermissionProjectScope ? await getPermissionProjectScope(actor, requiredPermission) : await require('./permissionChecker').getPermissionProjectScope(actor, requiredPermission);
    if (!permissionScope.hasGlobal && permissionScope.projectIds.length === 0) {
      const err = new Error('Forbidden: missing permission customer_questions.statistics'); err.statusCode = 403; throw err;
    }

    const canViewAll = await hasPermission(actor, 'customer_questions.view_all') || permissionScope.hasGlobal;

    let projectFilterSql = '';
    const values = [];
    let idx = 1;
    if (query.project_id !== undefined && query.project_id !== null) {
      const requestedProjectIds = Array.isArray(query.project_id)
        ? query.project_id.map(p => Number(p)).filter(p => !Number.isNaN(p))
        : [Number(query.project_id)].filter(p => !Number.isNaN(p));
      if (requestedProjectIds.length === 0) { const err = new Error('Invalid project_id'); err.statusCode = 400; throw err; }
      if (!canViewAll) {
        const forbidden = requestedProjectIds.find(pid => !permissionScope.projectIds.includes(pid));
        if (forbidden !== undefined) { const err = new Error('Forbidden: missing permission for requested project'); err.statusCode = 403; throw err; }
      }
      projectFilterSql = ` AND cq.project_id = ANY($${idx}::int[])`;
      values.push(requestedProjectIds);
      idx++;
    } else if (!canViewAll) {
      const allowedProjectIds = permissionScope.projectIds;
      if (!allowedProjectIds || allowedProjectIds.length === 0) return [];
      projectFilterSql = ` AND cq.project_id = ANY($${idx}::int[])`;
      values.push(allowedProjectIds);
      idx++;
    }

    const qTypes = `
      SELECT cq.type_id, ct.name AS type_name,
        COUNT(*)::int AS total_count,
        SUM(CASE WHEN cs.is_final THEN 1 ELSE 0 END)::int AS closed_count,
        SUM(CASE WHEN cs.is_final THEN 0 ELSE 1 END)::int AS open_count
      FROM customer_questions cq
      LEFT JOIN customer_question_status cs ON cs.id = cq.status_id
      LEFT JOIN customer_question_type ct ON ct.id = cq.type_id
      WHERE cq.is_active = true ${projectFilterSql}
      GROUP BY cq.type_id, ct.name
      ORDER BY ct.name NULLS LAST
    `;

    const qSpecs = `
      SELECT cq.specialization_id, sp.name AS specialization_name,
        COUNT(*)::int AS total_count,
        SUM(CASE WHEN cs.is_final THEN 1 ELSE 0 END)::int AS closed_count,
        SUM(CASE WHEN cs.is_final THEN 0 ELSE 1 END)::int AS open_count
      FROM customer_questions cq
      LEFT JOIN customer_question_status cs ON cs.id = cq.status_id
      LEFT JOIN specializations sp ON sp.id = cq.specialization_id
      WHERE cq.is_active = true ${projectFilterSql}
      GROUP BY cq.specialization_id, sp.name
      ORDER BY sp.name NULLS LAST
    `;

    const qTotal = `
      SELECT COUNT(*)::int AS total_count,
        SUM(CASE WHEN cs.is_final THEN 1 ELSE 0 END)::int AS closed_count,
        SUM(CASE WHEN cs.is_final THEN 0 ELSE 1 END)::int AS open_count
      FROM customer_questions cq
      LEFT JOIN customer_question_status cs ON cs.id = cq.status_id
      WHERE cq.is_active = true ${projectFilterSql}
    `;

    const [typesRes, specsRes, totalRes] = await Promise.all([pool.query(qTypes, values), pool.query(qSpecs, values), pool.query(qTotal, values)]);

    const computePercent = (it) => ({
      ...it,
      percent_closed: it.total_count > 0 ? Math.round((it.closed_count / it.total_count) * 10000) / 100 : 0
    });

    const types = (typesRes.rows || []).map(r => computePercent({
      type_id: r.type_id === null ? null : Number(r.type_id),
      type_name: r.type_name || null,
      total_count: Number(r.total_count) || 0,
      closed_count: Number(r.closed_count) || 0,
      open_count: Number(r.open_count) || 0
    }));

    const specializations = (specsRes.rows || []).map(r => computePercent({
      specialization_id: r.specialization_id === null ? null : Number(r.specialization_id),
      specialization_name: r.specialization_name || null,
      total_count: Number(r.total_count) || 0,
      closed_count: Number(r.closed_count) || 0,
      open_count: Number(r.open_count) || 0
    }));

    const totalRow = (totalRes.rows && totalRes.rows[0]) || { total_count: 0, closed_count: 0, open_count: 0 };
    const overall = {
      total_count: Number(totalRow.total_count) || 0,
      closed_count: Number(totalRow.closed_count) || 0,
      open_count: Number(totalRow.open_count) || 0,
      percent_closed: (Number(totalRow.total_count) || 0) > 0 ? Math.round(((Number(totalRow.closed_count) || 0) / Number(totalRow.total_count)) * 10000) / 100 : 0
    };

    return { overall, types, specializations };
  }

  static async getCustomerQuestionById(id, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const q = await CustomerQuestion.findById(Number(id));
    if (!q) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }

    // Extract ids from nested objects (model returns grouped objects, not flat fields)
    const statusId = q.status ? q.status.id : null;
    const typeId = q.type ? q.type.id : null;
    const projectId = q.project ? q.project.id : null;

    // Customer questions without a project are treated as orphaned legacy records
    // and must not be exposed through the API.
    if (!projectId) {
      const err = new Error('Customer question not found'); err.statusCode = 404; throw err;
    }

    // Ensure actor belongs to the question's project
    const Project = require('../../db/models/Project');
    const assigned = await Project.isUserAssigned(projectId, actor.id);
    if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }

    // Fetch available statuses via work flow transitions from current status
    try {
      if (statusId) {
        const wfSql = `SELECT cs.id, cs.name, cs.code, cs.description,
                       wf.id AS workflow_id, wf.name AS workflow_name, wf.description AS workflow_description
                       FROM customer_question_work_flow wf
                       JOIN customer_question_status cs ON wf.to_status_id = cs.id
                       WHERE wf.from_status_id = $1
                         AND (wf.customer_question_type_id IS NULL OR wf.customer_question_type_id = $2)
                         AND (wf.project_id IS NULL OR wf.project_id = $3)
                         AND (wf.is_active IS NULL OR wf.is_active = true)
                         AND (wf.required_permission IS NULL OR EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = $4 AND p.code = wf.required_permission AND (ur.project_id IS NULL OR ur.project_id = $3)))
                       ORDER BY wf.id`;
        const wfRes = await require('../../db/connection').query(wfSql, [statusId, typeId, projectId, actor.id]);
        let available = wfRes.rows || [];

        // Check for blocking relations (same logic as issues):
        // if another customer_question blocks this one and is not in a final status,
        // disallow transitions to final statuses.
        try {
          const EntityLink = require('../../db/models/EntityLink');
          const blockingLinks = await EntityLink.find({
            passive_type: 'customer_question',
            passive_id: Number(id),
            active_type: 'customer_question',
            relation_type: 'blocks'
          });
          const otherIds = [...new Set((blockingLinks || []).filter(l => l && l.active_id).map(l => Number(l.active_id)))];
          if (otherIds.length > 0) {
            const q2 = `SELECT cq.id, cs.is_final
                         FROM customer_questions cq
                         LEFT JOIN customer_question_status cs ON cs.id = cq.status_id
                         WHERE cq.id = ANY($1::int[])`;
            const res2 = await require('../../db/connection').query(q2, [otherIds]);
            const hasBlockerNotFinal = (res2.rows || []).some(r => !r.is_final);
            if (hasBlockerNotFinal) {
              // remove final statuses from available list
              available = available.filter(s => !s.is_final);
            }
          }
        } catch (e) {
          console.error('Failed to evaluate blocks links for customer_question available_statuses', e && e.message ? e.message : e);
        }

        q.available_statuses = available;
      } else {
        q.available_statuses = [];
      }
    } catch (e) {
      // If work flow table/columns are missing or error occurs, return question without available_statuses
      q.available_statuses = [];
    }
    return q;
  }

  static async createCustomerQuestion(fields, actor) {
    const requiredPermission = 'customer_questions.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!fields || !fields.question_text) { const err = new Error('Missing required field: question_text'); err.statusCode = 400; throw err; }
    const targetProjectId = fields.project_id !== undefined && fields.project_id !== null ? Number(fields.project_id) : null;
    const allowed = targetProjectId
      ? await hasPermissionForProject(actor, requiredPermission, targetProjectId)
      : await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create for target project'); err.statusCode = 403; throw err; }
    // default asked_by
    if (!fields.asked_by) fields.asked_by = actor.id;
    // resolve status -> status_id if provided as string/code
    if (fields.status !== undefined && fields.status !== null) {
      const s = fields.status;
      if (!Number.isNaN(Number(s))) {
        fields.status_id = Number(s);
      } else {
        // find or create status by code/name
        const res = await require('../../db/connection').query('SELECT id FROM customer_question_status WHERE code = $1 OR name = $1 LIMIT 1', [s]);
        if (res.rows[0]) fields.status_id = res.rows[0].id;
        else {
          const ins = await require('../../db/connection').query('INSERT INTO customer_question_status (name, code, created_at, updated_at) VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id', [s, s]);
          fields.status_id = ins.rows[0].id;
        }
      }
      delete fields.status;
    }
    const created = await CustomerQuestion.create(fields);
    // Notify: question_created_in_project
    {
      const prsRes = await pool.query('SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1', [created.project_id]);
      const projectParticipantIds = (prsRes.rows || []).map(r => Number(r.user_id)).filter(Boolean);
      const frontendRoot = process.env.FRONTEND_URL || '';
      const questionUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/customer_questions/${created.id}` : '';
      NotificationDispatcher.dispatch({
        eventCode: 'question_created_in_project',
        projectId: created.project_id,
        actor,
        entity: { id: created.id, code: 'customer_question', title: created.question_title || created.id },
        content: { value: created },
        participantIds: projectParticipantIds,
        templateContext: { project: { id: created.project_id, code: (created.project && created.project.code) || null }, question: created, actor, questionUrl },
        fallbackText: `New question in project ${created.project_id}`,
        fallbackSubject: `New question in project ${created.project_id}`
      });
    }

    return created;
  }

  static async updateCustomerQuestion(id, fields, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await CustomerQuestion.findById(Number(id));
    if (!existing) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    const currentProjectId = existing.project ? Number(existing.project.id) : null;
    const allowedCurrent = currentProjectId
      ? await hasPermissionForProject(actor, requiredPermission, currentProjectId)
      : await hasPermission(actor, requiredPermission);
    if (!allowedCurrent) { const err = new Error('Forbidden: missing permission customer_questions.update for this project'); err.statusCode = 403; throw err; }

    if (fields.project_id !== undefined && fields.project_id !== null && Number(fields.project_id) !== Number(currentProjectId)) {
      const allowedTarget = await hasPermissionForProject(actor, requiredPermission, Number(fields.project_id));
      if (!allowedTarget) { const err = new Error('Forbidden: missing permission customer_questions.update for target project'); err.statusCode = 403; throw err; }
    }
    // resolve status -> status_id if provided as string/code
    if (fields.status !== undefined && fields.status !== null) {
      const s = fields.status;
      if (!Number.isNaN(Number(s))) {
        fields.status_id = Number(s);
      } else {
        const res = await require('../../db/connection').query('SELECT id FROM customer_question_status WHERE code = $1 OR name = $1 LIMIT 1', [s]);
        if (res.rows[0]) fields.status_id = res.rows[0].id;
        else {
          const ins = await require('../../db/connection').query('INSERT INTO customer_question_status (name, code, created_at, updated_at) VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id', [s, s]);
          fields.status_id = ins.rows[0].id;
        }
      }
      delete fields.status;
    }
    const updated = await CustomerQuestion.update(Number(id), fields);
    if (!updated) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    // Record update in history (fire-and-forget)
    (async () => {
      try {
        await HistoryService.addCustomerQuestionHistory(Number(id), actor, 'updated', { before: existing, after: updated });
      } catch (e) { console.error('Failed to write customer question history for update', e && e.message ? e.message : e); }
    })();

    // Notify: question_updated_in_project
    {
      const prsRes = await pool.query('SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1', [updated.project_id]);
      const projectParticipantIds = (prsRes.rows || []).map(r => Number(r.user_id)).filter(Boolean);
      const frontendRoot = process.env.FRONTEND_URL || '';
      const questionUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/customer_questions/${updated.id}` : '';
      const projCtx = { id: updated.project_id, code: (updated.project && updated.project.code) || null };
      NotificationDispatcher.dispatch({
        eventCode: 'question_updated_in_project',
        projectId: updated.project_id,
        actor,
        entity: { id: updated.id, code: 'customer_question', title: updated.question_title || updated.id },
        content: { before: existing, after: updated },
        participantIds: projectParticipantIds,
        templateContext: { project: projCtx, question: updated, actor, questionUrl, changes: { before: existing, after: updated } },
        fallbackText: `Question updated: ${updated.question_title || updated.id}`,
        fallbackSubject: `Question updated ${updated.question_title || updated.id}`
      });

      // Notify: question_updated (specific participants)
      NotificationDispatcher.dispatch({
        eventCode: 'question_updated',
        projectId: updated.project_id,
        actor,
        entity: { id: updated.id, code: 'customer_question', title: updated.question_title || updated.id },
        content: { before: existing, after: updated },
        participantIds: [updated.asked_by, updated.answered_by, existing.asked_by, existing.answered_by],
        templateContext: { project: projCtx, question: updated, actor, questionUrl, changes: { before: existing, after: updated } },
        fallbackText: `Question updated: ${updated.question_title || updated.id}`,
        fallbackSubject: `Question updated ${updated.question_title || updated.id}`
      });
    }

    return updated;
  }

  static async deleteCustomerQuestion(id, actor) {
    const requiredPermission = 'customer_questions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await CustomerQuestion.findById(Number(id));
    if (!existing) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    const projectId = existing.project ? Number(existing.project.id) : null;
    const allowed = projectId
      ? await hasPermissionForProject(actor, requiredPermission, projectId)
      : await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.delete for this project'); err.statusCode = 403; throw err; }
    const ok = await CustomerQuestion.softDelete(Number(id));
    if (!ok) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  // File attachments
  static async attachFileToQuestion(questionId, storageId, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!questionId || Number.isNaN(Number(questionId)) || !storageId) { const err = new Error('Invalid parameters'); err.statusCode = 400; throw err; }
    // support single storageId or array of storageIds
    const storageIds = Array.isArray(storageId) ? storageId.map(Number) : [Number(storageId)];
    const storageItems = [];
    for (const sid of storageIds) {
      if (!sid || Number.isNaN(Number(sid))) { const err = new Error('Invalid storage id'); err.statusCode = 400; throw err; }
      const si = await Storage.findById(Number(sid));
      if (!si) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
      storageItems.push(si);
    }
    const attachedArr = [];
    for (const si of storageItems) {
      const attached = await CustomerQuestionStorage.attach({ customer_question_id: Number(questionId), storage_id: Number(si.id) });
      if (attached) attachedArr.push(attached);
      // Record history: new_value should be filename
      (async () => {
        try {
          await HistoryService.addCustomerQuestionHistory(Number(questionId), actor, 'file_attached', { before: null, after: si.file_name || null });
        } catch (e) { console.error('Failed to write customer question history for file attach', e && e.message ? e.message : e); }
      })();
    }
    return attachedArr.length === 1 ? attachedArr[0] : attachedArr;
  }

  static async detachFileFromQuestion(questionId, storageId, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    // support single storageId or array of storageIds
    const storageIds = Array.isArray(storageId) ? storageId.map(Number) : [Number(storageId)];
    const storageItems = [];
    for (const sid of storageIds) {
      if (!sid || Number.isNaN(Number(sid))) { const err = new Error('Invalid storage id'); err.statusCode = 400; throw err; }
      const si = await Storage.findById(Number(sid));
      storageItems.push(si);
      await CustomerQuestionStorage.detach({ customer_question_id: Number(questionId), storage_id: Number(sid) });
    }
    // Record history entries for each detached file
    for (const si of storageItems) {
      (async () => {
        try {
          await HistoryService.addCustomerQuestionHistory(Number(questionId), actor, 'file_detached', { before: si ? si.file_name : null, after: null });
        } catch (e) { console.error('Failed to write customer question history for file detach', e && e.message ? e.message : e); }
      })();
    }
    return { success: true };
  }

  static async listQuestionFiles(questionId, pager = {}, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    return CustomerQuestionStorage.listByQuestion(Number(questionId), pager);
  }

  /**
   * Add a message/comment to a customer question.
   * @param {number} questionId
   * @param {string} content
   * @param {Object} actor
   */
  static async addQuestionMessage(questionId, content, actor, parent_id = null) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    if (!questionId || Number.isNaN(Number(questionId))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await CustomerQuestion.findById(Number(questionId));
    if (!existing) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }

    if (!content || String(content).trim().length === 0) { const err = new Error('Empty content'); err.statusCode = 400; throw err; }

    const CustomerQuestionMessage = require('../../db/models/CustomerQuestionMessage');
    const created = await CustomerQuestionMessage.create({ customer_question_id: Number(questionId), user_id: actor.id, content: String(content), parent_id: parent_id ? Number(parent_id) : null });

    // Notify: comment_added (customer question)
    {
      const frontendRoot = process.env.FRONTEND_URL || '';
      const targetUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/customer_questions/${existing.id}` : '';
      NotificationDispatcher.dispatch({
        eventCode: 'comment_added',
        projectId: existing.project_id,
        actor,
        entity: { id: existing.id, code: 'customer_question', title: existing.question_title || existing.id },
        content: { value: created.content },
        participantIds: [existing.asked_by, existing.answered_by],
        templateContext: { project: { id: existing.project_id, code: (existing.project && existing.project.code) || null }, targetType: 'CustomerQuestion', targetId: existing.id, targetTitle: existing.question_title || existing.id, targetUrl, actor, message: created },
        fallbackText: `${existing.question_title || existing.id}: new comment`,
        fallbackSubject: `New comment on question ${existing.question_title || existing.id}`
      });
    }

    return created;
  }

  /**
   * List messages for a customer question
   */
  static async listQuestionMessages(questionId, opts = {}, actor) {
    const requiredPermission = 'customer_questions.messages';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    if (!questionId || Number.isNaN(Number(questionId))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await CustomerQuestion.findById(Number(questionId));
    if (!existing) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
    const hasGlobal = await hasPermission(actor, requiredPermission);
    const hasProject = existing.project_id ? await hasPermissionForProject(actor, requiredPermission, existing.project_id) : false;
    if (!hasGlobal && !hasProject) { const err = new Error(`Forbidden: missing permission ${requiredPermission}`); err.statusCode = 403; throw err; }

    const CustomerQuestionMessage = require('../../db/models/CustomerQuestionMessage');
    const messages = await CustomerQuestionMessage.listByQuestion(Number(questionId), opts);
    if (!messages || messages.length === 0) return [];

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
}

module.exports = CustomerQuestionsService;
