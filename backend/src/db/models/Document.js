const pool = require('../connection');

class Document {
  static _normalizeIntFilter(value) {
    if (value === undefined || value === null) return undefined;
    const values = Array.isArray(value)
      ? value
      : String(value).includes(',')
        ? String(value).split(',')
        : [value];
    const normalized = values
      .map(v => Number(v))
      .filter(v => !Number.isNaN(v));
    if (normalized.length === 0) return [];
    return normalized.length === 1 ? normalized[0] : normalized;
  }

  static async list(filters = {}, allowedProjectIds = null) {
    // filters: support common document attributes and pagination
    const {
      id,
      project_id,
      stage_id,
      public: publicFlag,
      type_id,
      specialization_id,
      directory_id,
      status_id,
      assigne_to,
      created_by,
      my_doc_user_id,
      is_closed,
      is_active,
      created_before,
      created_after,
      title,
      description,
      comment,
      priority,
      due_date,
      due_date_before,
      due_date_after,
      estimated_hours,
      estimated_hours_min,
      estimated_hours_max,
      search,
      page = 1,
      limit,
    } = filters;

    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;

    // Exact / equality filters
    if (id !== undefined) { where.push(`id = $${idx++}`); values.push(id); }
    if (project_id !== undefined && project_id !== null) {
      if (Array.isArray(project_id)) {
        const projectIds = project_id.map(p => Number(p)).filter(p => !Number.isNaN(p));
        if (projectIds.length === 0) return [];
        where.push(`project_id = ANY($${idx++}::int[])`);
        values.push(projectIds);
      } else {
        where.push(`project_id = $${idx++}`);
        values.push(project_id);
      }
    }
    if (stage_id !== undefined && stage_id !== null) {
      const stageIds = Document._normalizeIntFilter(stage_id);
      if (Array.isArray(stageIds)) {
        if (stageIds.length === 0) return [];
        where.push(`stage_id = ANY($${idx++}::int[])`);
        values.push(stageIds);
      } else {
        where.push(`stage_id = $${idx++}`);
        values.push(stageIds);
      }
    }
    if (specialization_id !== undefined && specialization_id !== null) {
      const specializationIds = Document._normalizeIntFilter(specialization_id);
      if (Array.isArray(specializationIds)) {
        if (specializationIds.length === 0) return [];
        where.push(`specialization_id = ANY($${idx++}::int[])`);
        values.push(specializationIds);
      } else {
        where.push(`specialization_id = $${idx++}`);
        values.push(specializationIds);
      }
    }
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
    if (status_id !== undefined && status_id !== null) {
      const statusIds = Document._normalizeIntFilter(status_id);
      if (Array.isArray(statusIds)) {
        if (statusIds.length === 0) return [];
        where.push(`status_id = ANY($${idx++}::int[])`);
        values.push(statusIds);
      } else {
        where.push(`status_id = $${idx++}`);
        values.push(statusIds);
      }
    }
    // is_closed: map to document_status.is_final boolean flag
    if (is_closed !== undefined && is_closed !== null) {
      where.push(`status_id IN (SELECT id FROM document_status WHERE is_final = $${idx++})`);
      values.push(is_closed);
    }
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
    // my_doc_user_id: return documents where user is creator, assignee or watcher
    if (my_doc_user_id !== undefined && my_doc_user_id !== null) {
      where.push(`(created_by = $${idx} OR assigne_to = $${idx} OR EXISTS (
        SELECT 1
        FROM entity_watchers ew
        WHERE ew.entity_type IN ('document', 'documents')
          AND ew.entity_id = documents.id
          AND ew.user_id = $${idx}
      ))`);
      values.push(my_doc_user_id);
      idx++;
    }
    // By default only return active documents unless caller explicitly passes is_active
    if (typeof is_active === 'undefined') {
      where.push(`is_active = true`);
    } else {
      where.push(`is_active = $${idx++}`); values.push(is_active);
    }

    // Public flag filter: if caller passed `public` in filters use it
    if (typeof publicFlag !== 'undefined') {
      // allow boolean or numeric
      where.push(`public = $${idx++}`); values.push(publicFlag);
    }

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

  // Textual filters: title/description/comment; use ILIKE for partial matches
  if (title) { where.push(`title ILIKE $${idx++}`); values.push(`%${title}%`); }
  if (description) { where.push(`description ILIKE $${idx++}`); values.push(`%${description}%`); }
  if (comment) { where.push(`comment ILIKE $${idx++}`); values.push(`%${comment}%`); }

    // Generic search across title/description (preserves existing behaviour)
    if (search) { where.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }

    // Restrict to allowedProjectIds if provided (array)
    if (Array.isArray(allowedProjectIds) && allowedProjectIds.length > 0) {
      where.push(`project_id = ANY($${idx++})`);
      values.push(allowedProjectIds);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  let q = `SELECT id, title, description, comment, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, is_active, public, created_at, updated_at, code, priority, due_date, estimated_hours, sfi_code_id,
    (
      SELECT MAX(h.created_at)
      FROM documents_history h
      JOIN document_status s ON s.id = NULLIF(h.new_value, '')::int
      WHERE h.document_id = documents.id
        AND h.field_name IN ('status_id', 'status')
        AND s.is_final = true
    ) AS close_date
    FROM documents ${whereSql} ORDER BY id`;
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
  const q = `SELECT id, title, description, comment, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, is_active, public, created_at, updated_at, code, priority, due_date, estimated_hours, sfi_code_id,
    (
      SELECT MAX(h.created_at)
      FROM documents_history h
      JOIN document_status s ON s.id = NULLIF(h.new_value, '')::int
      WHERE h.document_id = documents.id
        AND h.field_name IN ('status_id', 'status')
        AND s.is_final = true
    ) AS close_date
    FROM documents WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
  // Build INSERT dynamically so that DB defaults (e.g. priority) are preserved
  const allowedCols = ['title','description','comment','project_id','stage_id','type_id','specialization_id','directory_id','assigne_to','created_by','public','code','priority','due_date','estimated_hours','sfi_code_id'];
  const cols = [];
  const placeholders = [];
  const values = [];
  let idx = 1;
  for (const c of allowedCols) {
    if (fields[c] !== undefined) {
      cols.push(c);
      placeholders.push(`$${idx++}`);
      // Normalize null-ish values for nullable columns
      if (fields[c] === '' ) values.push(null);
      else values.push(fields[c]);
    }
  }
  // Ensure we have required columns
  if (cols.length === 0) throw new Error('No fields provided for insert');
  const q = `INSERT INTO documents (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id, title, description, comment, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, is_active, public, created_at, updated_at, code, priority, due_date, estimated_hours, sfi_code_id`;
  const res = await pool.query(q, values);
  return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
  ['title','description','comment','project_id','stage_id','type_id','specialization_id','directory_id','status_id','assigne_to','public','code','priority','due_date','estimated_hours','sfi_code_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Document.findById(id);
  const q = `UPDATE documents SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, title, description, comment, project_id, stage_id, status_id, type_id, specialization_id, directory_id, assigne_to, created_by, is_active, public, created_at, updated_at, code, priority, due_date, estimated_hours, sfi_code_id`;
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
