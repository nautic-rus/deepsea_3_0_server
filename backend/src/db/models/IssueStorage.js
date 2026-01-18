const pool = require('../connection');

class IssueStorage {
  static async attach({ issue_id, storage_id }) {
    const q = `INSERT INTO issue_storage (issue_id, storage_id) VALUES ($1,$2) ON CONFLICT (issue_id, storage_id) DO NOTHING RETURNING id, issue_id, storage_id, created_at`;
    const res = await pool.query(q, [issue_id, storage_id]);
    return res.rows[0] || null;
  }

  static async detach({ issue_id, storage_id }) {
    const q = `DELETE FROM issue_storage WHERE issue_id = $1 AND storage_id = $2 RETURNING id`;
    const res = await pool.query(q, [issue_id, storage_id]);
    return res.rows[0] || null;
  }

  static async listByIssue(issueId, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT s.id AS storage_id, st.bucket_name, st.object_key, st.storage_type, st.uploaded_by, st.created_at FROM issue_storage s JOIN storage st ON st.id = s.storage_id WHERE s.issue_id = $1 ORDER BY s.id DESC LIMIT $2 OFFSET $3`;
    const res = await pool.query(q, [issueId, limit, offset]);
    return res.rows;
  }
}

module.exports = IssueStorage;
