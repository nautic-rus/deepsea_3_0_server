const pool = require('../connection');

class Storage {
  static async list(filters = {}) {
    const { uploaded_by, storage_type, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (uploaded_by) { where.push(`uploaded_by = $${idx++}`); values.push(uploaded_by); }
    if (storage_type) { where.push(`storage_type = $${idx++}`); values.push(storage_type); }
    if (search) { where.push(`(bucket_name ILIKE $${idx} OR object_key ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, bucket_name, object_key, storage_type, file_category_id, uploaded_by, created_at FROM storage ${whereSql} ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, bucket_name, object_key, storage_type, file_category_id, uploaded_by, created_at FROM storage WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO storage (bucket_name, object_key, storage_type, file_category_id, uploaded_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, bucket_name, object_key, storage_type, file_category_id, uploaded_by, created_at`;
    const vals = [fields.bucket_name, fields.object_key, fields.storage_type || 's3', fields.file_category_id, fields.uploaded_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['bucket_name','object_key','storage_type','file_category_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Storage.findById(id);
    const q = `UPDATE storage SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, bucket_name, object_key, storage_type, file_category_id, uploaded_by, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE storage SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM storage WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Storage;
