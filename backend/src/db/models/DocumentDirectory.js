/**
 * DocumentDirectory model
 * Simple accessor for document_directories table.
 */
const pool = require('../connection');

class DocumentDirectory {
  /**
   * List directories
   * Returns rows with id, name, parent_id, order_index
   */
  static async list() {
    const q = `
      SELECT id, name, project_id, path, parent_id, description, order_index, created_by, updated_by, created_at, updated_at
      FROM document_directories
      ORDER BY project_id NULLS LAST, order_index NULLS LAST, id
    `;
    try {
      const res = await pool.query(q);
      return res.rows;
    } catch (e) {
      // If table doesn't exist in some deployments, return empty array instead of failing
      if (e && e.message && e.message.toLowerCase().includes('relation "document_directories"')) return [];
      throw e;
    }
  }

  static async create(fields) {
    const q = `
      INSERT INTO document_directories (name, project_id, path, parent_id, description, order_index, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, project_id, path, parent_id, description, order_index, created_by, updated_by, created_at, updated_at
    `;
    const vals = [
      fields.name,
      fields.project_id || null,
      fields.path || null,
      fields.parent_id || null,
      fields.description || null,
      fields.order_index || null,
      fields.created_by || null,
      fields.updated_by || null
    ];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const vals = [];
    let idx = 1;
    // allow updating common fields including metadata
    ['name', 'project_id', 'path', 'parent_id', 'description', 'order_index', 'updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) {
      const qFind = `SELECT id, name, project_id, path, parent_id, description, order_index FROM document_directories WHERE id = $1 LIMIT 1`;
      const r = await pool.query(qFind, [id]);
      return r.rows[0] || null;
    }
    const q = `UPDATE document_directories SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, name, project_id, path, parent_id, description, order_index, created_by, updated_by, created_at, updated_at`;
    vals.push(id);
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async softDelete(id, updated_by = null) {
    // Try soft-delete by is_active if column exists, otherwise delete row
    try {
      // attempt to set is_active and updated_by/updated_at when available
      if (updated_by !== null) {
        const q = `UPDATE document_directories SET is_active = false, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
        const res = await pool.query(q, [id, updated_by]);
        if (res.rowCount > 0) return true;
      } else {
        const q = `UPDATE document_directories SET is_active = false WHERE id = $1`;
        const res = await pool.query(q, [id]);
        if (res.rowCount > 0) return true;
      }
    } catch (e) {
      // ignore and fallback to hard delete
    }
    const q2 = `DELETE FROM document_directories WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = DocumentDirectory;
