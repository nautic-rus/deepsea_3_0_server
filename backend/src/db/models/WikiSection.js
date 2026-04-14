const pool = require('../connection');

class WikiSection {
  static async list(filters = {}) {
    const { id, parent_id, name, slug, created_by, project_id, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (id !== undefined) { where.push(`id = $${idx++}`); values.push(id); }
    if (parent_id !== undefined) { where.push(`parent_id = $${idx++}`); values.push(parent_id); }
    if (created_by !== undefined) { where.push(`created_by = $${idx++}`); values.push(created_by); }
    if (project_id !== undefined) {
      // allow filtering for NULL (no project) by passing project_id = 'null' or empty
      if (project_id === null || project_id === 'null' || project_id === '') {
        where.push(`project_id IS NULL`);
      } else {
        where.push(`project_id = $${idx++}`);
        values.push(project_id);
      }
    }
    if (name) { where.push(`name ILIKE $${idx++}`); values.push(`%${name}%`); }
    if (slug) { where.push(`slug = $${idx++}`); values.push(slug); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT id, name, slug, description, parent_id, order_index, project_id, created_by, updated_by, created_at, updated_at FROM wiki_sections ${whereSql} ORDER BY order_index, id`;
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
    const q = `SELECT id, name, slug, description, parent_id, order_index, project_id, created_by, updated_by, created_at, updated_at FROM wiki_sections WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO wiki_sections (name, slug, description, parent_id, order_index, project_id, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, slug, description, parent_id, order_index, project_id, created_by, updated_by, created_at, updated_at`;
    const vals = [fields.name, fields.slug, fields.description, fields.parent_id, fields.order_index, fields.project_id, fields.created_by, fields.updated_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['name','slug','description','parent_id','order_index','project_id','updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await WikiSection.findById(id);
    const q = `UPDATE wiki_sections SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, name, slug, description, parent_id, order_index, project_id, created_by, updated_by, created_at, updated_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `DELETE FROM wiki_sections WHERE id = $1`;
      const res = await pool.query(q, [id]);
      return res.rowCount > 0;
    } catch (err) {
      return false;
    }
  }
}

module.exports = WikiSection;
