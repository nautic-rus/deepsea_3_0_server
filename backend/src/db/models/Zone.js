const pool = require('../connection');

class Zone {
  static async list(filters = {}) {
    const { project_id, search, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;

    if (project_id !== undefined && project_id !== null && project_id !== '') {
      where.push(`z.project_id = $${idx++}`);
      values.push(project_id);
    }
    if (search) {
      where.push(`(z.name ILIKE $${idx} OR z.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT z.id, z.project_id, p.name AS project_name, z.name, z.description,
      z.bbox_min_x, z.bbox_min_y, z.bbox_min_z,
      z.bbox_max_x, z.bbox_max_y, z.bbox_max_z,
      z.created_at, z.updated_at
      FROM zones z
      LEFT JOIN projects p ON p.id = z.project_id
      ${whereSql}
      ORDER BY z.id`;

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
    const q = `SELECT z.id, z.project_id, p.name AS project_name, z.name, z.description,
      z.bbox_min_x, z.bbox_min_y, z.bbox_min_z,
      z.bbox_max_x, z.bbox_max_y, z.bbox_max_z,
      z.created_at, z.updated_at
      FROM zones z
      LEFT JOIN projects p ON p.id = z.project_id
      WHERE z.id = $1
      LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const allowed = [
      'project_id',
      'name',
      'description',
      'bbox_min_x',
      'bbox_min_y',
      'bbox_min_z',
      'bbox_max_x',
      'bbox_max_y',
      'bbox_max_z',
    ];
    const cols = [];
    const placeholders = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        cols.push(key);
        placeholders.push(`$${idx++}`);
        values.push(fields[key]);
      }
    }

    if (cols.length === 0) throw new Error('No fields provided');

    const q = `INSERT INTO zones (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
    const res = await pool.query(q, values);
    const row = res.rows[0];
    if (!row) return null;
    return await Zone.findById(row.id);
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;

    [
      'project_id',
      'name',
      'description',
      'bbox_min_x',
      'bbox_min_y',
      'bbox_min_z',
      'bbox_max_x',
      'bbox_max_y',
      'bbox_max_z',
    ].forEach((key) => {
      if (fields[key] !== undefined) {
        parts.push(`${key} = $${idx++}`);
        values.push(fields[key]);
      }
    });

    if (parts.length === 0) return await Zone.findById(id);

    const q = `UPDATE zones SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
    values.push(id);
    const res = await pool.query(q, values);
    const row = res.rows[0];
    if (!row) return null;
    return await Zone.findById(row.id);
  }

  static async softDelete(id) {
    const q = `DELETE FROM zones WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = Zone;
