const pool = require('../connection');

class Role {
  static async list() {
    const q = `SELECT id, name, description, created_at FROM roles ORDER BY id`;
    const res = await pool.query(q);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, name, description, created_at FROM roles WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create({ name, description }) {
    const q = `INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at`;
    const res = await pool.query(q, [name, description]);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    if (fields.name !== undefined) { parts.push(`name = $${idx++}`); values.push(fields.name); }
    if (fields.description !== undefined) { parts.push(`description = $${idx++}`); values.push(fields.description); }
    // project_id field removed from Role methods; roles are global in the model
    if (parts.length === 0) return await Role.findById(id);
    const q = `UPDATE roles SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, name, description, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    // Try soft-delete via is_active flag; if it fails, fallback to hard delete
    try {
      const q = `UPDATE roles SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {
      // ignore
    }
    const q2 = `DELETE FROM roles WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }

  static async findByName(name) {
    const q = `SELECT id, name, description, created_at FROM roles WHERE name = $1 LIMIT 1`;
    const res = await pool.query(q, [name]);
    return res.rows[0] || null;
  }

  static async findOrCreate({ name, description = null }) {
    const existing = await Role.findByName(name);
    if (existing) return existing;
    return await Role.create({ name, description });
  }

  /**
   * Assign a permission to a role by inserting into role_permissions.
   * This method is idempotent: if the link already exists it does nothing and returns false.
   * Returns the inserted row id when a new link was created, otherwise null.
   */
  static async addPermission(roleId, permissionId) {
    if (!roleId || Number.isNaN(Number(roleId)) || Number(roleId) <= 0) {
      const err = new Error('Invalid role id'); err.statusCode = 400; throw err;
    }
    if (!permissionId || Number.isNaN(Number(permissionId)) || Number(permissionId) <= 0) {
      const err = new Error('Invalid permission id'); err.statusCode = 400; throw err;
    }

    // Insert and ignore duplicate (unique constraint on role_id, permission_id)
    const q = `INSERT INTO role_permissions (role_id, permission_id, created_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (role_id, permission_id) DO NOTHING
               RETURNING id`;
    const res = await pool.query(q, [Number(roleId), Number(permissionId)]);
    return res.rows[0] ? res.rows[0].id : null;
  }

  /**
   * Remove a permission from a role by deleting from role_permissions.
   * Returns true if a row was removed, false if no link existed.
   */
  static async removePermission(roleId, permissionId) {
    if (!roleId || Number.isNaN(Number(roleId)) || Number(roleId) <= 0) {
      const err = new Error('Invalid role id'); err.statusCode = 400; throw err;
    }
    if (!permissionId || Number.isNaN(Number(permissionId)) || Number(permissionId) <= 0) {
      const err = new Error('Invalid permission id'); err.statusCode = 400; throw err;
    }

    const q = `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2 RETURNING id`;
    const res = await pool.query(q, [Number(roleId), Number(permissionId)]);
    return res.rowCount > 0;
  }
}

module.exports = Role;
