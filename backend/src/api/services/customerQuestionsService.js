const pool = require('../../db/connection');
const CustomerQuestion = require('../../db/models/CustomerQuestion');
const CustomerQuestionStorage = require('../../db/models/CustomerQuestionStorage');
const Storage = require('../../db/models/Storage');
const { hasPermission } = require('./permissionChecker');
const RocketChatService = require('./rocketChatService');
const HistoryService = require('./historyService');
const UserNotification = require('../../db/models/UserNotification');
const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
const TemplateService = require('./notificationTemplateService');
const EmailService = require('./emailService');
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
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    // Enforce that the actor belongs to the project(s) requested.
    const Project = require('../../db/models/Project');
    const projectIds = await Project.listAssignedProjectIds(actor.id);

    if (query.project_id !== undefined && query.project_id !== null) {
      const requestedProjectIds = Array.isArray(query.project_id)
        ? query.project_id.map(p => Number(p)).filter(p => !Number.isNaN(p))
        : [Number(query.project_id)].filter(p => !Number.isNaN(p));

      if (requestedProjectIds.length === 0) {
        const err = new Error('Invalid project_id'); err.statusCode = 400; throw err;
      }

      const notAssigned = requestedProjectIds.find(pid => !projectIds.includes(pid));
      if (notAssigned !== undefined) {
        const err = new Error('Forbidden: user is not assigned to the requested project'); err.statusCode = 403; throw err;
      }

      query.project_id = requestedProjectIds.length === 1 ? requestedProjectIds[0] : requestedProjectIds;
      return CustomerQuestion.list(query);
    }

    if (projectIds.length === 0) return [];
    const filters = Object.assign({}, query, { allowed_project_ids: projectIds });
    return CustomerQuestion.list(filters);
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

    // Ensure actor belongs to the question's project
    if (projectId) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(projectId, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

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
                       ORDER BY wf.id`;
        const wfRes = await require('../../db/connection').query(wfSql, [statusId, typeId, projectId]);
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
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.question_text) { const err = new Error('Missing required field: question_text'); err.statusCode = 400; throw err; }
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
    // Fire-and-forget: notify project participants subscribed to 'question_created_in_project'
    (async () => {
      try {
        const allRecipients = await UserNotificationSetting.getRecipientsForEvent(created.project_id, 'question_created_in_project');
        if (!allRecipients || allRecipients.length === 0) return;

        // Get project participant ids (users assigned via user_roles)
        const prsRes = await pool.query('SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1', [created.project_id]);
        const participantIds = new Set((prsRes.rows || []).map(r => Number(r.user_id)).filter(Boolean));

        // Keep only recipients who are project participants and not the actor
        const recipients = allRecipients.filter(r => participantIds.has(Number(r.user_id)) && (!actor || Number(r.user_id) !== Number(actor.id)));
        if (recipients.length === 0) return;

        const frontendRoot = process.env.FRONTEND_URL || '';
        const questionUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/customer_questions/${created.id}` : '';
        const context = { project: { id: created.project_id, code: (created.project && created.project.code) ? created.project.code : null }, question: created, actor: actor, questionUrl };

        for (const r of recipients) {
          try {
            const notifPayload = {
              user_id: r.user_id,
              event_code: 'question_created_in_project',
              project_id: created.project_id,
              data: { question: created, via: r.method_code || null, recipient: { user_id: r.user_id } }
            };
            UserNotification.create(notifPayload).catch(() => {});

            if (r.method_code === 'rocket_chat') {
              const rendered = await TemplateService.render('question_created_in_project', 'rocket_chat', context);
              const textToSend = rendered.text || rendered.html || `New question in project ${created.project_id}`;
              if (r.rc_username) {
                await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text: textToSend });
              } else if (r.rc_user_id) {
                await RocketChatService.sendMessage({ channel: r.rc_user_id, text: textToSend });
              }
            } else if (r.method_code === 'email') {
              const rendered = await TemplateService.render('question_created_in_project', 'email', context);
              const subject = rendered.subject || `New question in project ${created.project_id}`;
              try { await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html }); } catch (e) { console.error('Failed to send email', e && e.message ? e.message : e); }
            }
          } catch (e) { console.error('Failed to send question_created_in_project notification', e && e.message ? e.message : e); }
        }
      } catch (e) { console.error('Error while processing notifications for question_created_in_project', e && e.stack ? e.stack : e); }
    })();

    return created;
  }

  static async updateCustomerQuestion(id, fields, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await CustomerQuestion.findById(Number(id));
    if (!existing) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }
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

    // Fire-and-forget: notify project participants for 'question_updated_in_project'
    (async () => {
      try {
        const allRecipients = await UserNotificationSetting.getRecipientsForEvent(updated.project_id, 'question_updated_in_project');
        if (!allRecipients || allRecipients.length === 0) return;
        const prsRes = await pool.query('SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1', [updated.project_id]);
        const participantIds = new Set((prsRes.rows || []).map(r => Number(r.user_id)).filter(Boolean));
        const recipients = allRecipients.filter(r => participantIds.has(Number(r.user_id)) && (!actor || Number(r.user_id) !== Number(actor.id)));
        if (recipients.length === 0) return;

        const frontendRoot = process.env.FRONTEND_URL || '';
        const questionUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/customer_questions/${updated.id}` : '';
        const context = { project: { id: updated.project_id, code: (updated.project && updated.project.code) ? updated.project.code : null }, question: updated, actor: actor, questionUrl, changes: { before: existing, after: updated } };

        for (const r of recipients) {
          try {
            const notifPayload = {
              user_id: r.user_id,
              event_code: 'question_updated_in_project',
              project_id: updated.project_id,
              data: { question: updated, via: r.method_code || null, recipient: { user_id: r.user_id } }
            };
            UserNotification.create(notifPayload).catch(() => {});

            if (r.method_code === 'rocket_chat') {
              const rendered = await TemplateService.render('question_updated_in_project', 'rocket_chat', context);
              const textToSend = rendered.text || rendered.html || `Question updated: ${updated.question_title || updated.id}`;
              if (r.rc_username) await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text: textToSend });
              else if (r.rc_user_id) await RocketChatService.sendMessage({ channel: r.rc_user_id, text: textToSend });
            } else if (r.method_code === 'email') {
              const rendered = await TemplateService.render('question_updated_in_project', 'email', context);
              const subject = rendered.subject || `Question updated ${updated.question_title || updated.id}`;
              try { await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html }); } catch (e) { console.error('Failed to send email', e && e.message ? e.message : e); }
            }
          } catch (e) { console.error('Failed to send question_updated_in_project notification', e && e.message ? e.message : e); }
        }
      } catch (e) { console.error('Error while processing notifications for question_updated_in_project', e && e.stack ? e.stack : e); }
    })();

    // Fire-and-forget: notify specific participants (asked_by/answered_by) for 'question_updated'
    (async () => {
      try {
        const allRecipients = await UserNotificationSetting.getRecipientsForEvent(updated.project_id, 'question_updated');
        if (!allRecipients || allRecipients.length === 0) return;
        const participantIds = new Set([updated.asked_by, updated.answered_by, existing.asked_by, existing.answered_by].filter(Boolean).map(Number));
        const recipients = allRecipients.filter(r => participantIds.has(Number(r.user_id)) && (!actor || Number(r.user_id) !== Number(actor.id)));
        if (recipients.length === 0) return;

        const frontendRoot = process.env.FRONTEND_URL || '';
        const questionUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/customer_questions/${updated.id}` : '';
        const context = { project: { id: updated.project_id, code: (updated.project && updated.project.code) ? updated.project.code : null }, question: updated, actor: actor, questionUrl, changes: { before: existing, after: updated } };

        for (const r of recipients) {
          try {
            const notifPayload = {
              user_id: r.user_id,
              event_code: 'question_updated',
              project_id: updated.project_id,
              data: { question: updated, via: r.method_code || null, recipient: { user_id: r.user_id } }
            };
            UserNotification.create(notifPayload).catch(() => {});

            if (r.method_code === 'rocket_chat') {
              const rendered = await TemplateService.render('question_updated', 'rocket_chat', context);
              const textToSend = rendered.text || rendered.html || `Question updated: ${updated.question_title || updated.id}`;
              if (r.rc_username) await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text: textToSend });
              else if (r.rc_user_id) await RocketChatService.sendMessage({ channel: r.rc_user_id, text: textToSend });
            } else if (r.method_code === 'email') {
              const rendered = await TemplateService.render('question_updated', 'email', context);
              const subject = rendered.subject || `Question updated ${updated.question_title || updated.id}`;
              try { await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html }); } catch (e) { console.error('Failed to send email', e && e.message ? e.message : e); }
            }
          } catch (e) { console.error('Failed to send question_updated notification', e && e.message ? e.message : e); }
        }
      } catch (e) { console.error('Error while processing notifications for question_updated', e && e.stack ? e.stack : e); }
    })();

    return updated;
  }

  static async deleteCustomerQuestion(id, actor) {
    const requiredPermission = 'customer_questions.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
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
    const attached = await CustomerQuestionStorage.attach({ customer_question_id: Number(questionId), storage_id: Number(storageId) });
    return attached;
  }

  static async detachFileFromQuestion(questionId, storageId, actor) {
    const requiredPermission = 'customer_questions.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.update'); err.statusCode = 403; throw err; }
    await CustomerQuestionStorage.detach({ customer_question_id: Number(questionId), storage_id: Number(storageId) });
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

    // Notify subscribers (email/rocket/center notification)
    (async () => {
      try {
        const allRecipients = await UserNotificationSetting.getRecipientsForEvent(existing.project_id, 'comment_added');
        if (!allRecipients || allRecipients.length === 0) return;

        const participantIds = new Set([existing.asked_by, existing.answered_by].filter(Boolean).map(Number));
        const recipients = allRecipients.filter(r => participantIds.has(Number(r.user_id)) && (!actor || Number(r.user_id) !== Number(actor.id)));
        if (recipients.length === 0) return;

        const frontendRoot = process.env.FRONTEND_URL || '';
        const targetUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/customer_questions/${existing.id}` : '';
        const context = { project: { id: existing.project_id, code: (existing.project && existing.project.code) ? existing.project.code : null }, targetType: 'CustomerQuestion', targetId: existing.id, targetTitle: existing.question_title || existing.id, targetUrl, actor: actor, message: created };

        for (const r of recipients) {
          try {
            if (actor && typeof r.user_id !== 'undefined' && Number(r.user_id) === Number(actor.id)) continue;
            try {
              const notifPayload = {
                user_id: r.user_id,
                event_code: 'comment_added',
                project_id: existing.project_id,
                data: { customer_question_id: existing.id, message: created, via: r.method_code || null, recipient: { user_id: r.user_id } }
              };
              UserNotification.create(notifPayload).catch(() => {});
            } catch (e) { console.error('Failed to queue user notification', e && e.message ? e.message : e); }

            if (r.method_code === 'rocket_chat') {
              const rendered = await TemplateService.render('comment_added', 'rocket_chat', context);
              const textToSend = rendered.text || rendered.html || `${existing.question_title || existing.id}: new comment`;
              if (r.rc_username) {
                await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text: textToSend });
              } else if (r.rc_user_id) {
                await RocketChatService.sendMessage({ channel: r.rc_user_id, text: textToSend });
              } else {
                console.warn('No Rocket.Chat mapping for user', r.user_id);
              }
            } else if (r.method_code === 'email') {
              const rendered = await TemplateService.render('comment_added', 'email', context);
              const subject = rendered.subject || `New comment on question ${existing.question_title || existing.id}`;
              try { await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html }); } catch (mailErr) { console.error('Failed to send email', mailErr && mailErr.message ? mailErr.message : mailErr); }
            } else {
              console.log(`Unknown notification method ${r.method_code} for user ${r.user_id}`);
            }
          } catch (err) { console.error('Failed to send notification to user', r.user_id, err && err.message ? err.message : err); }
        }
      } catch (err) { console.error('Error while processing notifications for question comment_added:', err && err.stack ? err.stack : err); }
    })();

    return created;
  }

  /**
   * List messages for a customer question
   */
  static async listQuestionMessages(questionId, opts = {}, actor) {
    const requiredPermission = 'customer_questions.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission customer_questions.view'); err.statusCode = 403; throw err; }
    if (!questionId || Number.isNaN(Number(questionId))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await CustomerQuestion.findById(Number(questionId));
    if (!existing) { const err = new Error('Customer question not found'); err.statusCode = 404; throw err; }

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
