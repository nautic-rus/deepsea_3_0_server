/**
 * Модель для работы с организациями (organizations)
 */
const pool = require('../connection');

class Organization {
  static async findNameById(id) {
    if (!id) return null;
    const res = await pool.query('SELECT name FROM organizations WHERE id = $1', [id]);
    return res.rows[0] ? res.rows[0].name : null;
  }

  static async list() {
    const query = `
      SELECT o.id, o.name, o.slug, o.description, o.is_active, o.created_at, o.updated_at
      FROM organizations o
      ORDER BY o.id ASC
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async create(name, slug, description) {
    const res = await pool.query('INSERT INTO organizations (name, slug, description) VALUES ($1, $2, $3) RETURNING id, name, slug, description, is_active, created_at, updated_at', [name, slug, description]);
    return res.rows[0];
  }

  static async update(id, fields) {
    const allowed = ['name', 'slug', 'description', 'is_active'];
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
      const res = await pool.query('SELECT id, name, slug, description, is_active, created_at, updated_at FROM organizations WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    params.push(id);
    const updateQuery = `UPDATE organizations SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`;
    await pool.query(updateQuery, params);
    const res = await pool.query('SELECT id, name, slug, description, is_active, created_at, updated_at FROM organizations WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const res = await pool.query('UPDATE organizations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [id]);
      if (res.rowCount > 0) return true;
    } catch (e) {
      // ignore
    }
    const del = await pool.query('DELETE FROM organizations WHERE id = $1', [id]);
    return del.rowCount > 0;
  }
}

module.exports = Organization;
