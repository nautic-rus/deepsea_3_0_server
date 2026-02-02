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
      const query = Object.assign({}, req.query || {});
      // normalize boolean-like query params
      if (query.is_active !== undefined) {
        query.is_active = (query.is_active === 'true' || query.is_active === '1' || query.is_active === true);
      }
      const rows = await IssuesService.listIssues(query, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/issue_statuses - list all issue statuses
   */
  static async listStatuses(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await IssuesService.listStatuses(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/issue_types - list all issue types
   */
  static async listTypes(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await IssuesService.listTypes(actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/issue_statuses/:id - get single issue status by id
   */
  static async getStatus(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const rows = await IssuesService.listStatuses(actor);
      const row = (rows || []).find(r => Number(r.id) === Number(id));
      if (!row) { const err = new Error('Status not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  /**
   * GET /api/issue_types/:id - get single issue type by id
   */
  static async getType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const rows = await IssuesService.listTypes(actor);
      const row = (rows || []).find(r => Number(r.id) === Number(id));
      if (!row) { const err = new Error('Type not found'); err.statusCode = 404; throw err; }
      res.json(row);
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

  /**
   * Handle POST /api/issues/:id/assign - assign or change assignee of an issue.
   * Body: { assignee_id: <userId|null> }
   */
  static async assign(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { assignee_id } = req.body || {};
      const updated = await IssuesService.assignIssue(Number(id), assignee_id === null ? null : Number(assignee_id), actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  /**
   * Handle POST /api/issues/:id/messages - add a message to an issue.
   * Body: { content: string }
   */
  static async addMessage(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { content, parent_id = null } = req.body || {};
      const created = await IssuesService.addIssueMessage(Number(id), content, actor, parent);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * POST /api/issues/:id/files - attach existing storage item to issue
   * Body: { storage_id: number }
   */
  static async attachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      // If a file was uploaded via multipart/form-data (multer), req.file will exist
      if (req.file) {
        const StorageService = require('../services/storageService');
        const createdStorage = await StorageService.uploadAndCreate(req.file, actor, req.body || {});
        const created = await IssuesService.attachFileToIssue(Number(id), Number(createdStorage.id), actor);
        res.status(201).json({ data: created });
        return;
      }
      const { storage_id } = req.body || {};
      const created = await IssuesService.attachFileToIssue(Number(id), Number(storage_id), actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * Attach a file uploaded to local storage and link it to an issue.
   * Endpoint: POST /api/issues/:id/files/local
   */
  static async attachLocalFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (!req.file) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
      const StorageService = require('../services/storageService');
      const createdStorage = await StorageService.uploadToLocalAndCreate(req.file, actor, req.body || {});
      const created = await IssuesService.attachFileToIssue(Number(id), Number(createdStorage.id), actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  /**
   * DELETE /api/issues/:id/files/:storage_id - detach file from issue
   */
  static async detachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const storageId = parseInt(req.params.storage_id, 10);
      await IssuesService.detachFileFromIssue(Number(id), Number(storageId), actor);
      res.json({ message: 'File detached' });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/issues/:id/files - list attached files
   */
  static async listFiles(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { limit = 100, offset = 0 } = req.query || {};
      const rows = await IssuesService.listIssueFiles(Number(id), { limit: Number(limit), offset: Number(offset) }, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/issues/:id/messages - list messages for an issue
   */
  static async listMessages(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { limit = 100, offset = 0 } = req.query || {};
      const rows = await IssuesService.listIssueMessages(Number(id), { limit: Number(limit), offset: Number(offset) }, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }
}

module.exports = IssuesController;

