const pool = require('../connection');

class SpecificationVersion {
  static async list(filters = {}) {
    const { specification_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (specification_id) { where.push(`sv.specification_id = $${idx++}`); values.push(specification_id); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT sv.id, sv.specification_id, sv.version, sv.notes, sv.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.middle_name AS created_by_middle_name, sv.created_at
      , sv."lock"
      , sv.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.middle_name AS updated_by_middle_name, sv.updated_at
      FROM specification_version sv
      LEFT JOIN users cu ON cu.id = sv.created_by
      LEFT JOIN users uu ON uu.id = sv.updated_by
      ${whereSql} ORDER BY sv.id DESC`;
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
    const q = `SELECT sv.id, sv.specification_id, sv.version, sv.notes, sv.created_by, cu.first_name AS created_by_first_name, cu.last_name AS created_by_last_name, cu.middle_name AS created_by_middle_name, sv.created_at,
      sv."lock",
      sv.updated_by, uu.first_name AS updated_by_first_name, uu.last_name AS updated_by_last_name, uu.middle_name AS updated_by_middle_name, sv.updated_at
      FROM specification_version sv
      LEFT JOIN users cu ON cu.id = sv.created_by
      LEFT JOIN users uu ON uu.id = sv.updated_by
      WHERE sv.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO specification_version (specification_id, version, notes, created_by, updated_by, "lock") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, specification_id, version, notes, created_by, updated_by, "lock", created_at, updated_at`;
    const vals = [fields.specification_id, fields.version, fields.notes || null, fields.created_by, fields.updated_by || null, fields.lock ?? false];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async touch(id, updatedBy, executor = pool) {
    const q = `UPDATE specification_version
      SET updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, specification_id, version, notes, created_by, updated_by, "lock", created_at, updated_at`;
    const res = await executor.query(q, [id, updatedBy ?? null]);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['version', 'notes', 'updated_by', 'lock'].forEach((k) => {
      if (fields[k] !== undefined) {
        parts.push(k === 'lock' ? `"lock" = $${idx++}` : `${k} = $${idx++}`);
        values.push(fields[k]);
      }
    });
    if (parts.length === 0) return await SpecificationVersion.findById(id);
    const q = `UPDATE specification_version SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, specification_id, version, notes, created_by, updated_by, "lock", created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const existing = await SpecificationVersion.findById(id);
    if (!existing) return false;
    if (existing.lock) {
      const err = new Error('Specification version is locked');
      err.statusCode = 423;
      throw err;
    }
    const q = `DELETE FROM specification_version WHERE id = $1`;
    const res = await pool.query(q, [id]);
    return res.rowCount > 0;
  }
}

module.exports = SpecificationVersion;
