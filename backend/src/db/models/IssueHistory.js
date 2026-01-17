const pool = require('../connection');

/**
 * IssueHistory data access object for existing schema `issue_history`.
 * The project's DB schema defines `issue_history` with columns:
 *   id, issue_id, field_name, old_value, new_value, changed_by, created_at
 * This model maps service calls (action + details) into that structure.
 */
class IssueHistory {
  /**
   * Create a new issue history row.
   * Accepts fields: { issue_id, actor_id, action, details }
   * - action -> field_name
   * - details: if object and has { before, after } we map to old_value/new_value
   *   otherwise new_value contains JSON-stringified details.
   */
  static async create(fields) {
    const issueId = fields.issue_id;
    const actorId = fields.actor_id || null;
    const action = fields.action || null; // maps to field_name
    let oldValue = null;
    let newValue = null;
    if (fields.details !== undefined && fields.details !== null) {
      if (typeof fields.details === 'object' && (fields.details.before !== undefined || fields.details.after !== undefined)) {
        if (fields.details.before !== undefined && fields.details.before !== null) oldValue = typeof fields.details.before === 'string' ? fields.details.before : JSON.stringify(fields.details.before);
        if (fields.details.after !== undefined && fields.details.after !== null) newValue = typeof fields.details.after === 'string' ? fields.details.after : JSON.stringify(fields.details.after);
      } else {
        newValue = typeof fields.details === 'string' ? fields.details : JSON.stringify(fields.details);
      }
    }

    const q = `INSERT INTO issue_history (issue_id, field_name, old_value, new_value, changed_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, issue_id, field_name, old_value, new_value, changed_by, created_at`;
    const vals = [issueId, action, oldValue, newValue, actorId];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  /** List history entries for given issue id. */
  static async listByIssue(issueId) {
    const q = `SELECT id, issue_id, field_name, old_value, new_value, changed_by, created_at FROM issue_history WHERE issue_id = $1 ORDER BY created_at ASC`;
    const res = await pool.query(q, [issueId]);
    return res.rows;
  }
}

module.exports = IssueHistory;
