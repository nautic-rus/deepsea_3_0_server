/**
 * Модель для работы с группами (groups)
 */
const pool = require('../connection');

class Group {
  static async findNameById(id) {
    if (!id) return null;
    const res = await pool.query('SELECT name FROM groups WHERE id = $1', [id]);
    return res.rows[0] ? res.rows[0].name : null;
  }

  static async list() {
    const query = `
      SELECT g.id, g.name, g.description, g.is_active, g.created_at, g.updated_at
      FROM groups g
      ORDER BY g.id ASC
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async create(name, description) {
    const res = await pool.query('INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id, name, description, is_active, created_at, updated_at', [name, description]);
    return res.rows[0];
  }

  static async update(id, fields) {
    const allowed = ['name', 'description', 'is_active'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        sets.push(`${key} = $${idx}`);
        params.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) {
      const res = await pool.query('SELECT id, name, description, is_active, created_at, updated_at FROM groups WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    params.push(id);
    const updateQuery = `UPDATE groups SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`;
    await pool.query(updateQuery, params);
    const res = await pool.query('SELECT id, name, description, is_active, created_at, updated_at FROM groups WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const res = await pool.query('UPDATE groups SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [id]);
      if (res.rowCount > 0) return true;
    } catch (e) {
      // ignore
    }
    const del = await pool.query('DELETE FROM groups WHERE id = $1', [id]);
    return del.rowCount > 0;
  }
}

module.exports = Group;
