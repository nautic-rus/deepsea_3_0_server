const pool = require('../connection');

class IssueMessage {
  /**
   * Create a new message attached to an issue
   * @param {{issue_id:number,user_id:number,content:string}} payload
   */
  static async create({ issue_id, user_id, content }) {
    const q = `INSERT INTO issue_messages (issue_id, user_id, content) VALUES ($1,$2,$3) RETURNING id, issue_id, user_id, content, created_at`;
    const res = await pool.query(q, [issue_id, user_id, content]);
    return res.rows[0];
  }

  static async listByIssue(issueId, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT id, issue_id, user_id, content, created_at FROM issue_messages WHERE issue_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
    const res = await pool.query(q, [issueId, limit, offset]);
    return res.rows;
  }
}

module.exports = IssueMessage;
