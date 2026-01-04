const pool = require('../connection');

class UserProject {
  /**
   * Assign a user to a project. Role and assigned_by are optional.
   * Returns the inserted row.
   */
  static async assign(userId, projectId, assignedBy = null) {
    const q = `INSERT INTO user_projects (user_id, project_id, assigned_by, assigned_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id, project_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = now()
      RETURNING id, user_id, project_id, assigned_by, assigned_at`;
    const res = await pool.query(q, [userId, projectId, assignedBy]);
    return res.rows[0];
  }

  static async unassign(userId, projectId) {
    const q = `DELETE FROM user_projects WHERE user_id = $1 AND project_id = $2`;
    const res = await pool.query(q, [userId, projectId]);
    return res.rowCount > 0;
  }
}

module.exports = UserProject;
