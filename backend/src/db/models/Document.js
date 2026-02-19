const pool = require('../connection');

class Document {
  static async list(filters = {}, allowedProjectIds = null) {
    // filters: support common document attributes and pagination
    const {
      id,
      project_id,
      stage_id,
      type_id,
      specialization_id,
      directory_id,
      status_id,
      assigne_to,
      created_by,
      is_active,
      created_before,
      created_after,
      title,
      description,
      priority,
      due_date,
      due_date_before,
      due_date_after,
      estimated_hours,
      estimated_hours_min,
      estimated_hours_max,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;

    // Exact / equality filters
    if (id !== undefined) { where.push(`id = $${idx++}`); values.push(id); }
    if (project_id !== undefined) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (stage_id !== undefined) { where.push(`stage_id = $${idx++}`); values.push(stage_id); }
    if (specialization_id !== undefined) { where.push(`specialization_id = $${idx++}`); values.push(specialization_id); }
    if (directory_id !== undefined) {
      // If a directory_id filter is provided, include documents in that directory
      // and in all its descendant directories (recursive). Use a recursive CTE
      // to collect descendant ids from document_directories.parent_id.
      try {
        const dirsRes = await pool.query(`WITH RECURSIVE d AS (SELECT id FROM document_directories WHERE id = $1 UNION ALL SELECT dd.id FROM document_directories dd JOIN d ON dd.parent_id = d.id) SELECT id FROM d`, [Number(directory_id)]);
        const dirIds = (dirsRes.rows || []).map(r => r.id).filter(n => n !== undefined && n !== null);
        if (!dirIds || dirIds.length === 0) {
          // No such directory -> return empty result set early
          return [];
        }
        where.push(`directory_id = ANY($${idx++})`);
        values.push(dirIds);
      } catch (e) {
        // If document_directories table is missing or other error, fall back to exact match
        where.push(`directory_id = $${idx++}`);
        values.push(directory_id);
      }
    }
    if (status_id !== undefined) { where.push(`status_id = $${idx++}`); values.push(status_id); }
    // priority: accept single value, comma-separated list or repeated params (array)
    if (priority !== undefined && priority !== null) {
      if (Array.isArray(priority)) {
        where.push(`priority = ANY($${idx++})`); values.push(priority);
      } else if (String(priority).includes(',')) {
        where.push(`priority = ANY($${idx++})`); values.push(String(priority).split(',').map(s => s.trim()));
      } else {
        where.push(`priority = $${idx++}`); values.push(priority);
      }
    }
  if (created_by !== undefined) { where.push(`created_by = $${idx++}`); values.push(created_by); }
  if (assigne_to !== undefined) { where.push(`assigne_to = $${idx++}`); values.push(assigne_to); }
    if (is_active !== undefined) { where.push(`is_active = $${idx++}`); values.push(is_active); }

  // created_at range
  if (created_before) { where.push(`created_at <= $${idx++}`); values.push(created_before); }
  if (created_after) { where.push(`created_at >= $${idx++}`); values.push(created_after); }

  // due_date range filters
  if (due_date_before) { where.push(`due_date <= $${idx++}`); values.push(due_date_before); }
  if (due_date_after) { where.push(`due_date >= $${idx++}`); values.push(due_date_after); }

  // estimated_hours filters
  if (estimated_hours !== undefined && estimated_hours !== null) { where.push(`estimated_hours = $${idx++}`); values.push(estimated_hours); }
  if (estimated_hours_min !== undefined && estimated_hours_min !== null) { where.push(`estimated_hours >= $${idx++}`); values.push(estimated_hours_min); }
  if (estimated_hours_max !== undefined && estimated_hours_max !== null) { where.push(`estimated_hours <= $${idx++}`); values.push(estimated_hours_max); }

    // Textual filters: title/description; use ILIKE for partial matches
    if (title) { where.push(`title ILIKE $${idx++}`); values.push(`%${title}%`); }
    if (description) { where.push(`description ILIKE $${idx++}`); values.push(`%${description}%`); }

    // Generic search across title/description (preserves existing behaviour)
    if (search) { where.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

    // Restrict to allowedProjectIds if provided (array)
    if (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0) {
      where.push(`project_id = ANY($${idx++})`);
      values.push(allowedProjectIds);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const q = `SELECT id, title, description, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, created_at, code, priority, due_date, estimated_hours FROM documents ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
  const q = `SELECT id, title, description, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, created_at, code, priority, due_date, estimated_hours FROM documents WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
  const q = `INSERT INTO documents (title, description, project_id, stage_id, type_id, specialization_id, directory_id, assigne_to, created_by, code, priority, due_date, estimated_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, title, description, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, created_at, code, priority, due_date, estimated_hours`;
  const vals = [fields.title, fields.description, fields.project_id, fields.stage_id, fields.type_id || null, fields.specialization_id, fields.directory_id, fields.assigne_to || null, fields.created_by, fields.code || null, fields.priority || null, fields.due_date || null, fields.estimated_hours || null];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['title','description','project_id','stage_id','type_id','specialization_id','directory_id','status_id','assigne_to','code','priority','due_date','estimated_hours'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Document.findById(id);
    const q = `UPDATE documents SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, title, description, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, created_at, code, priority, due_date, estimated_hours`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE documents SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM documents WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Document;
