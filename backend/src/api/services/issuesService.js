const Issue = require('../../db/models/Issue');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

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
    // Enforce that the actor belongs to the project(s) requested.
    // Get list of project_ids the user is assigned to.
    const pjRes = await pool.query('SELECT project_id FROM user_projects WHERE user_id = $1', [actor.id]);
    const projectIds = pjRes.rows.map(r => r.project_id);

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
  // author_id default to actor.id if not provided (API field name). Stored in DB as reporter_id.
  if (!fields.author_id) fields.author_id = actor.id;
    return await Issue.create(fields);
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
    const updated = await Issue.update(Number(id), fields);
    if (!updated) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
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
    const ok = await Issue.softDelete(Number(id));
    if (!ok) { const err = new Error('Issue not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = IssuesService;
