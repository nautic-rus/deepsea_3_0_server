const IssuesService = require('../services/issuesService');

/**
 * HTTP controller for issue endpoints.
 *
 * Maps Express requests to service layer calls and sends JSON responses.
 */
class IssuesController {
  /**
   * Handle GET /api/issues - list issues with query filters.
   */
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await IssuesService.listIssues(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * Handle GET /api/issues/:id - retrieve a single issue.
   */
  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await IssuesService.getIssueById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * Handle POST /api/issues - create a new issue.
   */
  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await IssuesService.createIssue(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Handle PUT /api/issues/:id - update an issue.
   */
  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await IssuesService.updateIssue(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Handle DELETE /api/issues/:id - delete an issue.
   */
  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await IssuesService.deleteIssue(id, actor);
      res.json({ message: 'Issue deleted' });
    } catch (err) { next(err); }
  }

  /**
   * Handle PATCH /api/issues/:id/status - update only the status of an issue.
   */
  static async updateStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { status_id } = req.body || {};
      const updated = await IssuesService.updateIssue(id, { status_id }, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }
}

module.exports = IssuesController;

