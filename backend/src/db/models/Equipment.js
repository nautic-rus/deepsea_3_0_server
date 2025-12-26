const pool = require('../connection');

class Equipment {
  static async list(filters = {}) {
    const { project_id, supplier_id, status, page = 1, limit = 50, search } = filters;
    const offset = (page - 1) * limit;
    const where = [];
    const values = [];
    let idx = 1;
    if (project_id) { where.push(`project_id = $${idx++}`); values.push(project_id); }
    if (supplier_id) { where.push(`supplier_id = $${idx++}`); values.push(supplier_id); }
    if (status) { where.push(`status = $${idx++}`); values.push(status); }
    if (search) { where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, equipment_code, name, description, sfi_code_id, project_id, supplier_id, manufacturer, model, serial_number, installation_date, status, location, technical_specifications, created_by, created_at FROM equipment ${whereSql} ORDER BY id LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT id, equipment_code, name, description, sfi_code_id, project_id, supplier_id, manufacturer, model, serial_number, installation_date, status, location, technical_specifications, created_by, created_at FROM equipment WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO equipment (equipment_code, name, description, sfi_code_id, project_id, supplier_id, manufacturer, model, serial_number, installation_date, status, location, technical_specifications, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id, equipment_code, name, description, sfi_code_id, project_id, supplier_id, manufacturer, model, serial_number, installation_date, status, location, technical_specifications, created_by, created_at`;
    const vals = [fields.equipment_code, fields.name, fields.description, fields.sfi_code_id, fields.project_id, fields.supplier_id, fields.manufacturer, fields.model, fields.serial_number, fields.installation_date, fields.status, fields.location, fields.technical_specifications, fields.created_by];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['equipment_code','name','description','sfi_code_id','project_id','supplier_id','manufacturer','model','serial_number','installation_date','status','location','technical_specifications'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await Equipment.findById(id);
    const q = `UPDATE equipment SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id, equipment_code, name, description, sfi_code_id, project_id, supplier_id, manufacturer, model, serial_number, installation_date, status, location, technical_specifications, created_by, created_at`;
    values.push(id);
    const res = await pool.query(q, values);
    return res.rows[0] || null;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE equipment SET is_active = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM equipment WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = Equipment;
