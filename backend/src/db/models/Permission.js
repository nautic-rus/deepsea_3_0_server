/**
 * Модель для операций с разрешениями (permissions)
 */
const pool = require('../connection');

class Permission {
  /**
   * Проверить наличие разрешения у пользователя (через роли)
   */
  static async hasPermissionForUser(userId, permissionCode) {
    const query = `
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1 AND p.code = $2
      LIMIT 1
    `;
    const res = await pool.query(query, [userId, permissionCode]);
    return res.rowCount > 0;
  }

  /**
   * Возвращает список кодов разрешений, которые есть у пользователя (через роли).
   * Возвращаемые коды нормализованы (trim + lowercase).
   */
  static async listCodesForUser(userId) {
    const q = `
      SELECT DISTINCT p.code
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = $1
    `;
    const res = await pool.query(q, [userId]);
    return res.rows.map(r => (r.code || '').trim().toLowerCase()).filter(Boolean);
  }

  /**
   * Список всех разрешений
   */
  static async list() {
    const q = `SELECT id, name, code, description, resource, action FROM permissions ORDER BY id`;
    const res = await pool.query(q);
    return res.rows;
  }

  /**
   * List permissions assigned to a specific role
   */
  static async listByRole(roleId) {
    const q = `
      SELECT p.id, p.name, p.code, p.description, p.resource, p.action
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = $1
      ORDER BY p.id
    `;
    const res = await pool.query(q, [roleId]);
    return res.rows;
  }
}

module.exports = Permission;
