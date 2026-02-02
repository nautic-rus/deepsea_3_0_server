const Issue = require('../../db/models/Issue');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');
const RocketChatService = require('./rocketChatService');
const HistoryService = require('./historyService');
const IssueMessage = require('../../db/models/IssueMessage');
const UserNotification = require('../../db/models/UserNotification');
const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
const IssueStorage = require('../../db/models/IssueStorage');
const Storage = require('../../db/models/Storage');

/**
 * Service layer for issue-related business logic.
 *
 * Handles permission checks and coordinates calls to the Issue model.
 */
class IssuesService {
  /**
   * List issues accessible to the actor with optional filters and pagination.
   *
   * @param {Object} query - Query parameters from the request (filters like project_id, status_id, author_id, etc.)
   * @param {Object} actor - Authenticated user performing the request
   * @returns {Promise<Array<Object>>} Array of issue objects
   */
  static async listIssues(query = {}, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
  // If actor has global view permission, allow unrestricted listing
  const canViewAll = await hasPermission(actor, 'issues.view_all');
  if (canViewAll) {
    const rows = await Issue.list(query);
    await IssuesService.attachDisplayFieldsToList(rows);
    return rows;
  }

  

  // Enforce that the actor belongs to the project(s) requested.
    // Get list of project_ids the user is assigned to.
  const Project = require('../../db/models/Project');
  const projectIds = await Project.listAssignedProjectIds(actor.id);

    // If a specific project_id was requested, ensure user is assigned to it.
    if (query.project_id) {
      const pid = Number(query.project_id);
      if (!projectIds.includes(pid)) {
        const err = new Error('Forbidden: user is not assigned to the requested project'); err.statusCode = 403; throw err;
      }
      // pass through project_id as usual
      const rows = await Issue.list(query);
      await IssuesService.attachDisplayFieldsToList(rows);
      return rows;
    }

    // No specific project requested: restrict to user's projects
    if (projectIds.length === 0) return [];
    const filters = Object.assign({}, query, { allowed_project_ids: projectIds });
    const rows = await Issue.list(filters);
    await IssuesService.attachDisplayFieldsToList(rows);
    return rows;
  }

  /**
   * Attach lightweight textual display fields to an array of issues.
   * Mutates the array elements in-place and returns once complete.
   */
  static async attachDisplayFieldsToList(issues) {
    if (!issues || !Array.isArray(issues) || issues.length === 0) return;
    try {
      const projectIds = [...new Set(issues.filter(i => i.project_id).map(i => i.project_id))];
      const assigneeIds = [...new Set(issues.filter(i => i.assignee_id).map(i => i.assignee_id))];
      const authorIds = [...new Set(issues.filter(i => i.author_id).map(i => i.author_id))];
      const statusIds = [...new Set(issues.filter(i => i.status_id).map(i => i.status_id))];
      const typeIds = [...new Set(issues.filter(i => i.type_id).map(i => i.type_id))];

      const qProjects = projectIds.length ? pool.query(`SELECT id, name FROM projects WHERE id = ANY($1::int[])`, [projectIds]) : Promise.resolve({ rows: [] });
      const qUsers = (assigneeIds.length || authorIds.length) ? pool.query(`SELECT id, username, first_name, last_name, middle_name, email FROM users WHERE id = ANY($1::int[])`, [[...new Set([...assigneeIds, ...authorIds])]]) : Promise.resolve({ rows: [] });
      const qStatuses = statusIds.length ? pool.query(`SELECT id, name, code FROM issue_status WHERE id = ANY($1::int[])`, [statusIds]) : Promise.resolve({ rows: [] });
      const qTypes = typeIds.length ? pool.query(`SELECT id, name, code FROM issue_type WHERE id = ANY($1::int[])`, [typeIds]) : Promise.resolve({ rows: [] });

      const [projectsRes, usersRes, statusesRes, typesRes] = await Promise.all([qProjects, qUsers, qStatuses, qTypes]);

      const projectMap = new Map((projectsRes.rows || []).map(r => [r.id, r]));
      const userMap = new Map((usersRes.rows || []).map(r => [r.id, r]));
      const statusMap = new Map((statusesRes.rows || []).map(r => [r.id, r]));
      const typeMap = new Map((typesRes.rows || []).map(r => [r.id, r]));

      const mkUserDisplay = (u) => {
        if (!u) return null;
        const parts = [];
        if (u.last_name) parts.push(u.last_name);
        if (u.first_name) parts.push(u.first_name);
        if (u.middle_name) parts.push(u.middle_name);
        const byName = parts.length ? parts.join(' ') : null;
        return byName || u.username || u.email || null;
      };

      for (const it of issues) {
        const proj = it.project_id ? projectMap.get(it.project_id) : null;
        it.project_name = proj ? proj.name || null : null;
        const assignee = it.assignee_id ? userMap.get(it.assignee_id) : null;
        const author = it.author_id ? userMap.get(it.author_id) : null;
        it.assignee_name = mkUserDisplay(assignee);
        it.author_name = mkUserDisplay(author);
        const st = it.status_id ? statusMap.get(it.status_id) : null;
        it.status_name = st ? st.name : null;
        it.status_code = st ? st.code : null;
        const tp = it.type_id ? typeMap.get(it.type_id) : null;
        it.type_name = tp ? tp.name : null;
        it.type_code = tp ? tp.code : null;
        if (it.priority) {
          try { const p = String(it.priority); it.priority_text = p.charAt(0).toUpperCase() + p.slice(1); } catch (e) { it.priority_text = it.priority; }
        } else {
          it.priority_text = null;
        }
      }
    } catch (e) {
      console.error('Failed to attach display fields to issues list', e && e.message ? e.message : e);
    }
  }

  /**
   * Get a single issue by ID, enforcing view permissions.
   *
   * @param {number} id - Issue ID
   * @param {Object} actor - Authenticated user
   * @returns {Promise<Object>} Issue object
   */
  static async getIssueById(id, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const i = await Issue.findById(Number(id));
    if (!i) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    // Ensure actor belongs to the issue's project unless they have view_all
    const canViewSingleAll = await hasPermission(actor, 'issues.view_all');
    if (!canViewSingleAll && i.project_id) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(i.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }
    // Compute allowed next statuses according to issue_work_flow for this issue's type
    try {
      if (i.type_id && i.status_id) {
        const q = `SELECT s.id, s.name, s.code, s.color, s.is_final FROM issue_work_flow wf JOIN issue_status s ON s.id = wf.to_status_id WHERE wf.issue_type_id = $1 AND wf.from_status_id = $2 AND wf.is_active = true ORDER BY s.order_index`;
        const res = await pool.query(q, [i.type_id, i.status_id]);
        i.allowed_statuses = res.rows || [];
      } else {
        i.allowed_statuses = [];
      }
    } catch (e) {
      // don't break the request if lookup fails; log and continue
      console.error('Failed to load allowed issue statuses', e && e.message ? e.message : e);
      i.allowed_statuses = [];
    }

    // Add lightweight textual display fields for UI (do not attach full objects)
    try {
      const Project = require('../../db/models/Project');
      const User = require('../../db/models/User');
      // Resolve project name, assignee and author display names, status and type names
      const lookups = [];
      if (i.project_id) {
        lookups.push(Project.findById(i.project_id));
      } else {
        lookups.push(Promise.resolve(null));
      }
      // users
      if (i.assignee_id) lookups.push(User.findById(i.assignee_id)); else lookups.push(Promise.resolve(null));
      if (i.author_id) lookups.push(User.findById(i.author_id)); else lookups.push(Promise.resolve(null));

      // status and type names from lookup tables
      const qStatus = i.status_id ? pool.query('SELECT id, name, code FROM issue_status WHERE id = $1 LIMIT 1', [i.status_id]) : Promise.resolve({ rows: [] });
      const qType = i.type_id ? pool.query('SELECT id, name, code FROM issue_type WHERE id = $1 LIMIT 1', [i.type_id]) : Promise.resolve({ rows: [] });

      const [projectRow, assigneeRow, authorRow, statusRes, typeRes] = await Promise.all([...lookups, qStatus, qType]);

      i.project_name = projectRow ? projectRow.name || null : null;

      const mkUserDisplay = (u) => {
        if (!u) return null;
        const parts = [];
        if (u.last_name) parts.push(u.last_name);
        if (u.first_name) parts.push(u.first_name);
        if (u.middle_name) parts.push(u.middle_name);
        const byName = parts.length ? parts.join(' ') : null;
        return byName || u.username || u.email || null;
      };

      i.assignee_name = mkUserDisplay(assigneeRow);
      i.author_name = mkUserDisplay(authorRow);

      i.status_name = (statusRes && statusRes.rows && statusRes.rows[0]) ? statusRes.rows[0].name : null;
      i.status_code = (statusRes && statusRes.rows && statusRes.rows[0]) ? statusRes.rows[0].code : null;

      i.type_name = (typeRes && typeRes.rows && typeRes.rows[0]) ? typeRes.rows[0].name : null;
      i.type_code = (typeRes && typeRes.rows && typeRes.rows[0]) ? typeRes.rows[0].code : null;

      // humanize priority (lightweight)
      if (i.priority) {
        try {
          const p = String(i.priority);
          i.priority_text = p.charAt(0).toUpperCase() + p.slice(1);
        } catch (e) { i.priority_text = i.priority; }
      } else {
        i.priority_text = null;
      }
    } catch (e) {
      console.error('Failed to resolve display fields for issue', e && e.message ? e.message : e);
      // keep original issue object even if lookups fail
    }

    return i;
  }

  /**
   * Create a new issue after permission checks.
   *
   * @param {Object} fields - Issue fields from the request body
   * @param {Object} actor - Authenticated user
   * @returns {Promise<Object>} Created issue
   */
  static async createIssue(fields, actor) {
    const requiredPermission = 'issues.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.project_id || !fields.title) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    // Ensure actor is allowed to create issues in the target project
    const canCreateAll = await hasPermission(actor, 'issues.create_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    const Project = require('../../db/models/Project');
    const project = await Project.findById(Number(fields.project_id));
    if (!project) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    if (!canCreateAll && !canViewAllProjects && project.owner_id !== actor.id) {
      const assigned = await Project.isUserAssigned(project.id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to target project'); err.statusCode = 403; throw err; }
    }
    // author_id default to actor.id if not provided (API field name). Stored in DB as reporter_id.
    if (!fields.author_id) fields.author_id = actor.id;
    const created = await Issue.create(fields);

    // Add history record for creation (fire-and-forget) - save per-field values
    (async () => {
      try {
        await HistoryService.addIssueHistory(created.id, actor, 'created', { before: {}, after: created });
      } catch (e) { console.error('Failed to write issue history for created issue', e && e.message ? e.message : e); }
    })();

    // Fire-and-forget: notify users who subscribed to 'issue_created' (project-specific or global)
    (async () => {
      try {
        const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
        const TemplateService = require('./notificationTemplateService');
        const EmailService = require('./emailService');

        const recipients = await UserNotificationSetting.getRecipientsForEvent(created.project_id, 'issue_created');
        if (!recipients || recipients.length === 0) return;

        const verbose = process.env.NOTIFICATION_VERBOSE === 'true';
        if (verbose) console.log('Notification recipients for issue_created:', recipients.map(r => ({ user_id: r.user_id, method: r.method_code, rc_username: r.rc_username, email: r.email })));

        const projectName = project.name || `#${created.project_id}`;
        const frontendRoot = process.env.FRONTEND_URL || '';
        const issueUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/projects/${created.project_id}/issues/${created.id}` : '';

        const context = {
          project: project,
          issue: created,
          actor: actor,
          issueUrl
        };

        for (const r of recipients) {
          try {
            // Create notification center entry for the user (non-blocking)
            try {
              const UserNotification = require('../../db/models/UserNotification');
              const notifPayload = {
                user_id: r.user_id,
                event_code: 'issue_created',
                project_id: created.project_id,
                data: {
                  issue: created,
                  via: r.method_code || null,
                  recipient: { user_id: r.user_id }
                }
              };
              // fire-and-forget; don't await to avoid delaying notifications (but catch errors)
              UserNotification.create(notifPayload).catch((e) => console.error('Failed to create user notification', e && e.message ? e.message : e));
            } catch (e) {
              console.error('Failed to queue user notification', e && e.message ? e.message : e);
            }
            if (r.method_code === 'rocket_chat') {
              const rendered = await TemplateService.render('issue_created', 'rocket_chat', context);
              const textToSend = rendered.text || rendered.html || `${projectName}: New issue #${created.id} - ${created.title}`;
              if (verbose) console.log('Rendered Rocket.Chat message for user', r.user_id, textToSend);
              if (r.rc_username) {
                await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text: textToSend });
              } else if (r.rc_user_id) {
                await RocketChatService.sendMessage({ channel: r.rc_user_id, text: textToSend });
              } else {
                console.warn('No Rocket.Chat mapping for user', r.user_id);
              }
            } else if (r.method_code === 'email') {
              const rendered = await TemplateService.render('issue_created', 'email', context);
              const subject = rendered.subject || `New issue #${created.id}`;
              if (verbose) console.log('Rendered Email for user', r.user_id, { subject, text: rendered.text, html: !!rendered.html });
              try {
                await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html });
              } catch (mailErr) {
                console.error('Failed to send email to', r.email, mailErr && mailErr.message ? mailErr.message : mailErr);
              }
            } else {
              console.log(`Unknown notification method ${r.method_code} for user ${r.user_id}`);
            }
          } catch (err) {
            console.error('Failed to send notification to user', r.user_id, err && err.message ? err.message : err);
          }
        }
      } catch (err) {
        console.error('Error while processing notifications for issue_created:', err && err.stack ? err.stack : err);
      }
    })();

    return created;
  }

  /**
   * Update an existing issue after permission checks.
   *
   * @param {number} id - Issue ID
   * @param {Object} fields - Fields to update
   * @param {Object} actor - Authenticated user
   * @returns {Promise<Object>} Updated issue
   */
  static async updateIssue(id, fields, actor) {
    const requiredPermission = 'issues.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Ensure actor belongs to the issue's project (unless elevated permission)
    const canUpdateAll = await hasPermission(actor, 'issues.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    const updated = await Issue.update(Number(id), fields);
    if (!updated) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    // Record update in history (fire-and-forget)
    (async () => {
      try {
        await HistoryService.addIssueHistory(Number(id), actor, 'updated', { before: existing, after: updated });
      } catch (e) { console.error('Failed to write issue history for update', e && e.message ? e.message : e); }
    })();
    return updated;
  }

  /**
   * List all issue statuses (reads full rows from issue_status table).
   * Requires permission: issues.view
   */
  static async listStatuses(actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    const res = await pool.query('SELECT * FROM issue_status ORDER BY COALESCE(order_index, 0), id');
    return res.rows || [];
  }

  /**
   * List all issue types (reads full rows from issue_type table).
   * Requires permission: issues.view
   */
  static async listTypes(actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    const res = await pool.query('SELECT * FROM issue_type ORDER BY COALESCE(order_index, 0), id');
    return res.rows || [];
  }

  

  /**
   * Assign or unassign an issue to an assignee (user).
   * Performs permission checks similar to updateIssue and sends notifications for 'task_assigned'.
   *
   * @param {number} id
   * @param {number|null} assigneeId
   * @param {Object} actor
   */
  static async assignIssue(id, assigneeId, actor) {
    const requiredPermission = 'issues.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }

    // Ensure actor belongs to the issue's project (unless elevated permission)
    const canUpdateAll = await hasPermission(actor, 'issues.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    // Only proceed if assignee changed (or explicit unassign)
    const prevAssignee = existing.assignee_id || null;
    const newAssignee = assigneeId || null;
    if (prevAssignee === newAssignee) {
      // Nothing to change; return existing record
      return existing;
    }

    const updated = await Issue.update(Number(id), { assignee_id: newAssignee });
    if (!updated) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }

    // Record assignment in history (fire-and-forget) - write only changed field 'assignee_id'
    (async () => {
      try {
        await HistoryService.addIssueHistory(Number(id), actor, 'assigned', { before: { assignee_id: prevAssignee }, after: { assignee_id: newAssignee } });
      } catch (e) { console.error('Failed to write issue history for assignment', e && e.message ? e.message : e); }
    })();

    // Send notifications for 'task_assigned' (fire-and-forget)
    (async () => {
      try {
        const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
        const TemplateService = require('./notificationTemplateService');
        const EmailService = require('./emailService');
        const UserNotification = require('../../db/models/UserNotification');

        const projectId = updated.project_id;
        const recipients = await UserNotificationSetting.getRecipientsForEvent(projectId, 'task_assigned');
        if (!recipients || recipients.length === 0) {
          // Still create a center notification for the assignee if present
          if (newAssignee) {
            try { await UserNotification.create({ user_id: newAssignee, event_code: 'task_assigned', project_id: projectId, data: { issue: updated, assigned_by: actor.id } }); } catch(e) { console.error('Failed to create user notification for assignee', e && e.message ? e.message : e); }
          }
          return;
        }

        const projectModel = require('../../db/models/Project');
        const project = await projectModel.findById(projectId);
        const frontendRoot = process.env.FRONTEND_URL || '';
        const issueUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/projects/${projectId}/issues/${updated.id}` : '';

        const context = { project, issue: updated, actor, issueUrl, prevAssignee };
        const verbose = process.env.NOTIFICATION_VERBOSE === 'true';

        for (const r of recipients) {
          try {
            // Queue center notification
            try {
              await UserNotification.create({ user_id: r.user_id, event_code: 'task_assigned', project_id: projectId, data: { issue: updated, via: r.method_code || null, recipient: { user_id: r.user_id }, assigned_by: actor.id } });
            } catch (e) { console.error('Failed to create user notification', e && e.message ? e.message : e); }

            if (r.method_code === 'rocket_chat') {
              const rendered = await TemplateService.render('task_assigned', 'rocket_chat', context);
              const textToSend = rendered.text || rendered.html || `Task #${updated.id} assigned: ${updated.title}`;
              if (verbose) console.log('Rendered Rocket.Chat message for user', r.user_id, textToSend);
              if (r.rc_username) {
                await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text: textToSend });
              } else if (r.rc_user_id) {
                await RocketChatService.sendMessage({ channel: r.rc_user_id, text: textToSend });
              } else {
                console.warn('No Rocket.Chat mapping for user', r.user_id);
              }
            } else if (r.method_code === 'email') {
              const rendered = await TemplateService.render('task_assigned', 'email', context);
              const subject = rendered.subject || `Task assigned #${updated.id}`;
              if (verbose) console.log('Rendered Email for user', r.user_id, { subject, text: rendered.text, html: !!rendered.html });
              try {
                await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html });
              } catch (mailErr) {
                console.error('Failed to send email to', r.email, mailErr && mailErr.message ? mailErr.message : mailErr);
              }
            } else {
              console.log(`Unknown notification method ${r.method_code} for user ${r.user_id}`);
            }
          } catch (err) {
            console.error('Failed to send notification to user', r.user_id, err && err.message ? err.message : err);
          }
        }
      } catch (err) {
        console.error('Error while processing notifications for task_assigned:', err && err.stack ? err.stack : err);
      }
    })();

    return updated;
  }

  /**
   * Add a message/comment to an issue.
   * @param {number} id - issue id
   * @param {string} content - message content
   * @param {Object} actor - user performing the action
   */
  static async addIssueMessage(id, content, actor, parent_id = null) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }

    // Ensure actor is assigned to project unless they have view_all
    const canViewAll = await hasPermission(actor, 'issues.view_all');
    if (!canViewAll && existing.project_id) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    if (!content || String(content).trim().length === 0) { const err = new Error('Empty content'); err.statusCode = 400; throw err; }

  const created = await IssueMessage.create({ issue_id: Number(id), user_id: actor.id, content: String(content), parent: parent ? Number(parent) : null });

    // History: simple entry for comment
    (async () => {
      try {
        await HistoryService.addIssueHistory(Number(id), actor, 'commented', { before: {}, after: { comment: created.content } });
      } catch (e) { console.error('Failed to write issue history for comment', e && e.message ? e.message : e); }
    })();

    // Notify issue participants (assignee, author) by creating user_notifications
    (async () => {
      try {
        const recipients = [];
        if (existing.assignee_id && existing.assignee_id !== actor.id) recipients.push(existing.assignee_id);
        if (existing.author_id && existing.author_id !== actor.id && existing.author_id !== existing.assignee_id) recipients.push(existing.author_id);
        for (const uid of recipients) {
          try {
            await UserNotification.create({ user_id: uid, event_code: 'comment_added', project_id: existing.project_id, data: { issue_id: existing.id, message: created } });
          } catch (e) { console.error('Failed to create user notification for comment', e && e.message ? e.message : e); }
        }
      } catch (e) { console.error('Failed to enqueue notifications for issue comment', e && e.message ? e.message : e); }
    })();

    return created;
  }

  /**
   * Attach an existing storage item to an issue.
   * @param {number} id - issue id
   * @param {number} storageId - storage item id
   * @param {Object} actor
   */
  static async attachFileToIssue(id, storageId, actor) {
    const requiredPermission = 'issues.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId || Number.isNaN(Number(storageId))) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }

    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    const storageItem = await Storage.findById(Number(storageId));
    if (!storageItem) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }

    // Ensure actor belongs to the project's scope unless elevated
    const canUpdateAll = await hasPermission(actor, 'issues.update_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    if (!canUpdateAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    const attached = await IssueStorage.attach({ issue_id: Number(id), storage_id: Number(storageId) });

    // History
    (async () => {
      try {
        await HistoryService.addIssueHistory(Number(id), actor, 'file_attached', { before: {}, after: { storage_id: storageId } });
      } catch (e) { console.error('Failed to write issue history for file attach', e && e.message ? e.message : e); }
    })();

    return attached;
  }

  static async detachFileFromIssue(id, storageId, actor) {
    const requiredPermission = 'issues.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id)) || !storageId || Number.isNaN(Number(storageId))) { const err = new Error('Invalid id/storageId'); err.statusCode = 400; throw err; }
    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    const detached = await IssueStorage.detach({ issue_id: Number(id), storage_id: Number(storageId) });
    (async () => {
      try {
        await HistoryService.addIssueHistory(Number(id), actor, 'file_detached', { before: {}, after: { storage_id: storageId } });
      } catch (e) { console.error('Failed to write issue history for file detach', e && e.message ? e.message : e); }
    })();

    // Attempt to delete storage object + DB record. This may fail if actor lacks storage.delete permission;
    // we won't block the detach operation because of that — just log failures.
    (async () => {
      try {
        const StorageService = require('./storageService');
        try {
          await StorageService.deleteStorage(Number(storageId), actor);
        } catch (e) {
          // If forbidden or not found, just log
          console.error('Failed to delete storage after detach', e && e.message ? e.message : e);
        }
      } catch (e) { console.error('Failed to run post-detach storage cleanup', e && e.message ? e.message : e); }
    })();

    return detached;
  }

  static async listIssueFiles(id, opts = {}, actor) {
    // basic permission check
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    return await IssueStorage.listByIssue(Number(id), opts);
  }

  /**
   * List messages for an issue (comments)
   * @param {number} id - issue id
   * @param {{limit:number,offset:number}} opts
   * @param {Object} actor
   */
  static async listIssueMessages(id, opts = {}, actor) {
    const requiredPermission = 'issues.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }

    // Ensure actor belongs to the issue's project unless they have view_all
    const canViewAll = await hasPermission(actor, 'issues.view_all');
    if (!canViewAll && existing.project_id) {
      const Project = require('../../db/models/Project');
      const assigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!assigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    const messages = await IssueMessage.listByIssue(Number(id), opts);
    if (!messages || messages.length === 0) return [];

    // Enrich messages with user display info (full_name, email, url_avatar)
    const userIds = [...new Set(messages.map(m => m.user_id).filter(Boolean))];
    let usersMap = new Map();
    if (userIds.length) {
      const res = await pool.query(`SELECT id, email, phone, avatar_url, first_name, last_name, middle_name, username FROM users WHERE id = ANY($1::int[])`, [userIds]);
      usersMap = new Map((res.rows || []).map(u => [u.id, u]));
    }

    return messages.map(m => {
      const u = usersMap.get(m.user_id) || null;
      const fullName = u ? [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ') : null;
      return Object.assign({}, m, { user: u ? { id: u.id, full_name: fullName || u.username || u.email, email: u.email, phone: u.phone, url_avatar: u.avatar_url } : null });
    });
  }

  /**
   * Delete (soft-delete) an issue after permission checks.
   *
   * @param {number} id - Issue ID
   * @param {Object} actor - Authenticated user
   * @returns {Promise<Object>} Result object
   */
  static async deleteIssue(id, actor) {
    const requiredPermission = 'issues.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission issues.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Ensure actor belongs to the issue's project (unless elevated permission)
    const canDeleteAll = await hasPermission(actor, 'issues.delete_all');
    const canViewAllProjects = await hasPermission(actor, 'projects.view_all');
    const existing = await Issue.findById(Number(id));
    if (!existing) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    if (!canDeleteAll && !canViewAllProjects && existing.project_id) {
      const Project = require('../../db/models/Project');
      const isAssigned = await Project.isUserAssigned(existing.project_id, actor.id);
      if (!isAssigned) { const err = new Error('Forbidden: user not assigned to this project'); err.statusCode = 403; throw err; }
    }

    const ok = await Issue.softDelete(Number(id));
    if (!ok) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }

    // Record deletion in history (fire-and-forget)
    (async () => {
      try {
        // Represent soft-delete as change of is_active -> false
        const after = Object.assign({}, existing, { is_active: false });
        await HistoryService.addIssueHistory(Number(id), actor, 'deleted', { before: existing, after });
      } catch (e) { console.error('Failed to write issue history for deletion', e && e.message ? e.message : e); }
    })();
    return { success: true };
  }
}

module.exports = IssuesService;
