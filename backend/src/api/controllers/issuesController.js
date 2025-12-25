const IssuesService = require('../services/issuesService');

class IssuesController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const rows = await IssuesService.listIssues(req.query || {}, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await IssuesService.getIssueById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await IssuesService.createIssue(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await IssuesService.updateIssue(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await IssuesService.deleteIssue(id, actor);
      res.json({ message: 'Issue deleted' });
    } catch (err) { next(err); }
  }

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

