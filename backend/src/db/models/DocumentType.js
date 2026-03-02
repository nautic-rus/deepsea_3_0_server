const pool = require('../connection');

class DocumentType {
  static async list(projectId) {
    if (typeof projectId !== 'undefined') {
      const q = 'SELECT * FROM document_type WHERE (project_id IS NULL OR project_id = $1) ORDER BY name, id';
      const res = await pool.query(q, [projectId]);
      return res.rows || [];
    }
    const res = await pool.query('SELECT * FROM document_type ORDER BY name, id');
    return res.rows || [];
  }

  static async findById(id) {
    const res = await pool.query('SELECT * FROM document_type WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const cols = ['name','code','description'];
    const vals = [fields.name, fields.code || null, fields.description || null];
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO document_type (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) return await DocumentType.findById(id);
    const q = `UPDATE document_type SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const res = await pool.query('DELETE FROM document_type WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = DocumentType;
const pool = require('../connection');

class DocumentType {
  static async list(projectId) {
    if (typeof projectId !== 'undefined') {
      const q = 'SELECT * FROM document_type WHERE (project_id IS NULL OR project_id = $1) ORDER BY COALESCE(order_index,0), id';
      const res = await pool.query(q, [projectId]);
      return res.rows || [];
    }
    const res = await pool.query('SELECT * FROM document_type ORDER BY COALESCE(order_index,0), id');
    return res.rows || [];
  }

  static async findById(id) {
    const res = await pool.query('SELECT * FROM document_type WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const cols = ['name','code','description','icon','color','order_index'];
    const vals = [fields.name, fields.code, fields.description || null, fields.icon || null, fields.color || null, fields.order_index || 0];
    if (fields.project_id !== undefined && fields.project_id !== null) { cols.push('project_id'); vals.push(Number(fields.project_id)); }
    const q = `INSERT INTO document_type (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','icon','color','order_index','project_id'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) return await DocumentType.findById(id);
    const q = `UPDATE document_type SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const res = await pool.query('DELETE FROM document_type WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = DocumentType;
