const IssueHistory = require('../../db/models/IssueHistory');
const DocumentHistory = require('../../db/models/DocumentHistory');

/**
 * HistoryService
 * Convenience methods to add timeline/history entries for issues and documents.
 */
class HistoryService {
  /**
   * Add issue history record.
   * @param {number} issueId
   * @param {Object|number} actor - actor object or actor id
   * @param {string} action - short action code, e.g. 'created','assigned','status_changed'
   * @param {Object|string|null} details - optional details object/string
   */
  static async addIssueHistory(issueId, actor, action, details = null) {
    const actorId = (actor && typeof actor === 'object') ? (actor.id || actor.user_id || null) : actor;
    // If details contains before/after objects, write only changed fields as separate history rows
    if (details && typeof details === 'object' && details.before && details.after && typeof details.before === 'object' && typeof details.after === 'object') {
      const before = details.before || {};
      const after = details.after || {};
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      const writes = [];
      for (const k of keys) {
        const bv = before[k];
        const av = after[k];
        const bvStr = bv === undefined ? null : (typeof bv === 'string' ? bv : JSON.stringify(bv));
        const avStr = av === undefined ? null : (typeof av === 'string' ? av : JSON.stringify(av));
        // consider null vs undefined and actual equality
        if (bvStr === avStr) continue;
        writes.push(IssueHistory.create({ issue_id: issueId, actor_id: actorId, action: k, details: { before: bv, after: av } }));
      }
      return Promise.all(writes);
    }

    const payload = { issue_id: issueId, actor_id: actorId, action, details };
    return IssueHistory.create(payload);
  }

  /**
   * Add document history record.
   * @param {number} documentId
   * @param {Object|number} actor - actor object or actor id
   * @param {string} action - short action code
   * @param {Object|string|null} details - optional details
   */
  static async addDocumentHistory(documentId, actor, action, details = null) {
    const actorId = (actor && typeof actor === 'object') ? (actor.id || actor.user_id || null) : actor;
    if (details && typeof details === 'object' && details.before && details.after && typeof details.before === 'object' && typeof details.after === 'object') {
      const before = details.before || {};
      const after = details.after || {};
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      const writes = [];
      for (const k of keys) {
        const bv = before[k];
        const av = after[k];
        const bvStr = bv === undefined ? null : (typeof bv === 'string' ? bv : JSON.stringify(bv));
        const avStr = av === undefined ? null : (typeof av === 'string' ? av : JSON.stringify(av));
        if (bvStr === avStr) continue;
        writes.push(DocumentHistory.create({ document_id: documentId, actor_id: actorId, action: k, details: { before: bv, after: av } }));
      }
      return Promise.all(writes);
    }

    const payload = { document_id: documentId, actor_id: actorId, action, details };
    return DocumentHistory.create(payload);
  }
}

module.exports = HistoryService;
