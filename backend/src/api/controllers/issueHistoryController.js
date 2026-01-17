const IssuesService = require('./issuesController') || require('../../api/controllers/issuesController');
const IssuesServiceSvc = require('../services/issuesService');
const IssueHistory = require('../../db/models/IssueHistory');

/**
 * Controller to expose issue history entries.
 */
class IssueHistoryController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const issueId = Number(req.params.id);
      if (!issueId || Number.isNaN(issueId)) { const err = new Error('Invalid issue id'); err.statusCode = 400; throw err; }
      // Reuse IssuesService.getIssueById to enforce permissions
      const IssuesService = require('../services/issuesService');
      await IssuesService.getIssueById(issueId, actor);
      const rows = await IssueHistory.listByIssue(issueId);
      return res.json(rows);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = IssueHistoryController;
