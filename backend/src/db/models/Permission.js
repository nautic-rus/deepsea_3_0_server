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
   * Список всех разрешений
   */
  static async list() {
    const q = `SELECT id, name, code, description, created_at, updated_at FROM permissions ORDER BY id`;
    const res = await pool.query(q);
    return res.rows;
  }

  /**
   * List permissions assigned to a specific role
   */
  static async listByRole(roleId) {
    const q = `
      SELECT p.id, p.name, p.code, p.description, p.created_at, p.updated_at
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = $1
      ORDER BY p.id
    `;
    const res = await pool.query(q, [roleId]);
    return res.rows;
  }

  /**
   * Create a new permission. Returns the created row.
   * Ensures code is unique (throws if a permission with same code exists).
   */
  static async create({ name, code, description = null }) {
    // normalize code
    const normCode = code ? code.trim() : null;
    if (!normCode) {
      const err = new Error('Permission code is required'); err.statusCode = 400; throw err;
    }

    // Check uniqueness
    const existsQ = `SELECT 1 FROM permissions WHERE code = $1 LIMIT 1`;
    const ex = await pool.query(existsQ, [normCode]);
    if (ex.rowCount > 0) {
      const err = new Error('Permission code already exists'); err.statusCode = 409; throw err;
    }

    const q = `
      INSERT INTO permissions (name, code, description)
      VALUES ($1, $2, $3)
      RETURNING id, name, code, description, created_at, updated_at
    `;
    const res = await pool.query(q, [name || null, normCode, description || null]);
    return res.rows[0];
  }

  /**
   * Update an existing permission by id. Accepts fields: name, code, description, resource, action.
   * Returns the updated row or null if not found.
   */
  static async update(id, fields = {}) {
    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) {
      const err = new Error('Invalid permission id'); err.statusCode = 400; throw err;
    }

  const allowed = ['name', 'code', 'description'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        // normalize code if present
        if (key === 'code' && fields[key]) {
          params.push(fields[key].trim());
        } else {
          params.push(fields[key]);
        }
        sets.push(`${key} = $${idx}`);
        idx++;
      }
    }

    if (sets.length === 0) {
      // Nothing to update — return current row
      const q = `SELECT id, name, code, description, created_at, updated_at FROM permissions WHERE id = $1`;
      const r = await pool.query(q, [id]);
      return r.rows[0] || null;
    }

    // If code is being changed, ensure uniqueness
    if (Object.prototype.hasOwnProperty.call(fields, 'code') && fields.code) {
      const normCode = fields.code.trim();
      const exQ = `SELECT 1 FROM permissions WHERE code = $1 AND id <> $2 LIMIT 1`;
      const ex = await pool.query(exQ, [normCode, id]);
      if (ex.rowCount > 0) {
        const err = new Error('Permission code already exists'); err.statusCode = 409; throw err;
      }
    }

    const updateQ = `UPDATE permissions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, name, code, description, created_at, updated_at`;
    params.push(id);
    const res = await pool.query(updateQ, params);
    return res.rows[0] || null;
  }

  /**
   * Delete a permission and any role_permissions links. Returns true if deleted.
   */
  static async delete(id) {
    if (!id || Number.isNaN(Number(id)) || Number(id) <= 0) {
      const err = new Error('Invalid permission id'); err.statusCode = 400; throw err;
    }

    // Remove associations first to avoid FK constraint if present
    await pool.query('DELETE FROM role_permissions WHERE permission_id = $1', [id]);

    const res = await pool.query('DELETE FROM permissions WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  }
}

module.exports = Permission;
