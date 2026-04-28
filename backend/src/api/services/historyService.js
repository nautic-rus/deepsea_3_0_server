const IssueHistory = require('../../db/models/IssueHistory');
const DocumentHistory = require('../../db/models/DocumentHistory');
const CustomerQuestionHistory = require('../../db/models/CustomerQuestionHistory');

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
        if (k === 'updated_at' || k === 'updatedAt' || k === 'created_at' || k === 'createdAt' || k === 'archive_data' || k === 'archiveData' || k === 'status_edit_date' || k === 'statusEditDate') continue;
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

    const payload = { issue_id: issueId, actor_id: actorId, action };
    if (details && typeof details === 'object') {
      const d = Array.isArray(details) ? details : Object.assign({}, details);
      delete d.updated_at;
      delete d.updatedAt;
      payload.details = d;
    } else {
      payload.details = details;
    }
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
    // Special-case: when a file is attached to a document, store the documents_storage record id
    // as the new_value (and in document_storage_id) instead of serializing the full attached object.
    if (action === 'file_attached' && details && typeof details === 'object') {
      const docStorageId = (details.after && (details.after.id || details.after.document_storage_id)) || (details.id || details.document_storage_id) || null;
      const payload = { document_id: documentId, actor_id: actorId, action, details: docStorageId !== null ? String(docStorageId) : null, document_storage_id: docStorageId };
      return DocumentHistory.create(payload);
    }
    if (details && typeof details === 'object' && details.before && details.after && typeof details.before === 'object' && typeof details.after === 'object') {
      const before = details.before || {};
      const after = details.after || {};
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      const writes = [];
      for (const k of keys) {
        if (k === 'updated_at' || k === 'updatedAt' || k === 'created_at' || k === 'createdAt' || k === 'archive_data' || k === 'archiveData' || k === 'status_edit_date' || k === 'statusEditDate') continue;
        const bv = before[k];
        const av = after[k];
        const bvStr = bv === undefined ? null : (typeof bv === 'string' ? bv : JSON.stringify(bv));
        const avStr = av === undefined ? null : (typeof av === 'string' ? av : JSON.stringify(av));
        if (bvStr === avStr) continue;
        let actionName = k;
        // If change originates from a documents_storage row, map certain fields to storage-specific names
        const docStorageId = (before && (before.id || before.document_storage_id)) || (after && (after.id || after.document_storage_id)) || null;
        if (docStorageId) {
          if (k === 'status_id') actionName = 'storage_status_id';
          if (k === 'type_id') actionName = 'storage_type_id';
          if (k === 'reason_id') actionName = 'storage_reason_id';
        }
        writes.push(DocumentHistory.create({ document_id: documentId, actor_id: actorId, action: actionName, details: { before: bv, after: av }, document_storage_id: docStorageId }));
      }
      return Promise.all(writes);
    }

    const payload = { document_id: documentId, actor_id: actorId, action };
    if (details && typeof details === 'object') {
      const d = Array.isArray(details) ? details : Object.assign({}, details);
      delete d.updated_at;
      delete d.updatedAt;
      payload.details = d;
    } else {
      payload.details = details;
    }
    return DocumentHistory.create(payload);
  }

  /**
   * Add customer question history record.
   * @param {number} questionId
   * @param {Object|number} actor - actor object or actor id
   * @param {string} action - short action code
   * @param {Object|string|null} details - optional details
   */
  static async addCustomerQuestionHistory(questionId, actor, action, details = null) {
    const actorId = (actor && typeof actor === 'object') ? (actor.id || actor.user_id || null) : actor;
    if (details && typeof details === 'object' && details.before && details.after && typeof details.before === 'object' && typeof details.after === 'object') {
      const before = details.before || {};
      const after = details.after || {};
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
      const writes = [];
      for (const k of keys) {
        if (k === 'updated_at' || k === 'updatedAt' || k === 'created_at' || k === 'createdAt' || k === 'archive_data' || k === 'archiveData' || k === 'status_edit_date' || k === 'statusEditDate') continue;
        let bv = before[k];
        let av = after[k];
        // For status and type fields, normalize to id only (avoid storing full object)
        if (k === 'status' || k === 'status_id') {
          if (bv && typeof bv === 'object') bv = bv.id || bv.status_id || null;
          if (av && typeof av === 'object') av = av.id || av.status_id || null;
        }
        if (k === 'type' || k === 'type_id') {
          if (bv && typeof bv === 'object') bv = bv.id || bv.type_id || null;
          if (av && typeof av === 'object') av = av.id || av.type_id || null;
        }
        const bvStr = bv === undefined ? null : (typeof bv === 'string' ? bv : JSON.stringify(bv));
        const avStr = av === undefined ? null : (typeof av === 'string' ? av : JSON.stringify(av));
        if (bvStr === avStr) continue;
        let actionName = k;
        if (k === 'status') actionName = 'status_id';
        if (k === 'type') actionName = 'type_id';
        writes.push(CustomerQuestionHistory.create({ question_id: questionId, actor_id: actorId, action: actionName, details: { before: bv, after: av } }));
      }
      return Promise.all(writes);
    }

    const payload = { question_id: questionId, actor_id: actorId, action };
    if (details && typeof details === 'object') {
      const d = Array.isArray(details) ? details : Object.assign({}, details);
      delete d.updated_at;
      delete d.updatedAt;
      payload.details = d;
    } else {
      payload.details = details;
    }
    return CustomerQuestionHistory.create(payload);
  }

}

module.exports = HistoryService;
