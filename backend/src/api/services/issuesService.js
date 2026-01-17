const Issue = require('../../db/models/Issue');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');
const RocketChatService = require('./rocketChatService');
const HistoryService = require('./historyService');

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
  if (canViewAll) return await Issue.list(query);

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
      return await Issue.list(query);
    }

    // No specific project requested: restrict to user's projects
    if (projectIds.length === 0) return [];
    const filters = Object.assign({}, query, { allowed_project_ids: projectIds });
    return await Issue.list(filters);
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
