/**
 * Модель для работы с отделами
 */
const pool = require('../connection');

class Department {
  static async findNameById(id) {
    if (!id) return null;
    const res = await pool.query('SELECT name FROM department WHERE id = $1', [id]);
    return res.rows[0] ? res.rows[0].name : null;
  }

  static async list() {
    const query = `
      SELECT d.id,
             d.name,
             d.manager_id,
             TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS manager_name
      FROM department d
      LEFT JOIN users u ON d.manager_id = u.id
      ORDER BY d.id ASC
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  static async create(name) {
    const res = await pool.query('INSERT INTO department (name) VALUES ($1) RETURNING id, name', [name]);
    return res.rows[0];
  }

  static async update(id, fields) {
    const allowed = ['name', 'description', 'manager_id'];
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
      const res = await pool.query(
        `SELECT d.id, d.name, d.description, d.manager_id, TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS manager_name, d.created_at, d.updated_at
         FROM department d
         LEFT JOIN users u ON d.manager_id = u.id
         WHERE d.id = $1`,
        [id]
      );
      return res.rows[0] || null;
    }
    params.push(id);
    // perform update then re-select enriched row to include manager_name
    const updateQuery = `UPDATE department SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`;
    await pool.query(updateQuery, params);
    const res = await pool.query(
      `SELECT d.id, d.name, d.description, d.manager_id, TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS manager_name, d.created_at, d.updated_at
       FROM department d
       LEFT JOIN users u ON d.manager_id = u.id
       WHERE d.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    // Mark department as inactive (if table has is_active) or delete flag; fallback to deleting row if no such column
    try {
      // try is_active column
      const res = await pool.query("UPDATE department SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id", [id]);
      if (res.rowCount > 0) return true;
    } catch (e) {
      // ignore and try delete
    }
    const del = await pool.query('DELETE FROM department WHERE id = $1', [id]);
    return del.rowCount > 0;
  }
}

module.exports = Department;
