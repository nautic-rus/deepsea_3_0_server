const pool = require('../connection');

class UserRole {
  /**
   * Assign a role to a user within an optional project scope.
   */
  static async assign(userId, roleId, projectId = null) {
    const q = `INSERT INTO user_roles (user_id, role_id, project_id, created_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id, role_id, project_id) DO NOTHING
      RETURNING id, user_id, role_id, project_id, created_at`;
    const res = await pool.query(q, [userId, roleId, projectId]);
    return res.rows[0] || null;
  }

  static async unassign(userId, roleId, projectId = null) {
    const q = `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 AND (project_id = $3 OR (project_id IS NULL AND $3 IS NULL))`;
    const res = await pool.query(q, [userId, roleId, projectId]);
    return res.rowCount > 0;
  }

  static async unassignByUserAndProject(userId, projectId) {
    const q = `DELETE FROM user_roles WHERE user_id = $1 AND project_id = $2`;
    const res = await pool.query(q, [userId, projectId]);
    return res.rowCount > 0;
  }
}

module.exports = UserRole;
