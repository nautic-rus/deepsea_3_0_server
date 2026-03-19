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

  static async listByIssue(issueId, { limit, offset = 0 } = {}) {
    // Return the storage_id from the join (s.storage_id), and include file metadata
    let q = `SELECT s.storage_id AS storage_id, st.bucket_name, st.object_key, st.file_name, st.file_size, st.mime_type, st.storage_type, st.uploaded_by, st.created_at FROM issue_storage s JOIN storage st ON st.id = s.storage_id WHERE s.issue_id = $1 ORDER BY s.id DESC`;
    const params = [issueId];
    if (limit != null) {
      params.push(limit, offset);
      q += ` LIMIT $2 OFFSET $3`;
    } else if (offset) {
      params.push(offset);
      q += ` OFFSET $2`;
    }
    const res = await pool.query(q, params);
    return res.rows;
  }
}

module.exports = IssueStorage;
