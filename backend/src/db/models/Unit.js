const pool = require('../connection');

class Unit {
  static async list({ page = 1, limit, search } = {}) {
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (search) { where.push(`name ILIKE $${idx}`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, name, code, symbol, description, kei, created_at, updated_at FROM units ${whereSql} ORDER BY id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, name, code, symbol, description, kei, created_at, updated_at FROM units WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const allowed = ['name','code','symbol','description','kei'];
    const cols = [];
    const placeholders = [];
    const values = [];
    let idx = 1;
    for (const c of allowed) {
      if (fields[c] !== undefined) {
        cols.push(c);
        placeholders.push(`$${idx++}`);
        values.push(fields[c]);
      }
    }
    if (cols.length === 0) throw new Error('No fields provided');
    const q = `INSERT INTO units (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`;
    const res = await pool.query(q, values);
    const r = res.rows[0];
    if (!r) return null;
    return await Unit.findById(r.id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['name','code','symbol','description','kei'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Unit.findById(id);
    const q = `UPDATE units SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    const r = res.rows[0];
    if (!r) return null;
    return await Unit.findById(r.id);
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE units SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM units WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Unit;
