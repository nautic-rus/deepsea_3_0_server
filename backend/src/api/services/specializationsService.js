const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

class SpecializationsService {
  static async list(actor) {
    const requiredPermission = 'users.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission users.view'); err.statusCode = 403; throw err; }
    const res = await pool.query('SELECT * FROM specializations ORDER BY COALESCE(order_index, 0), id');
    return res.rows || [];
  }

  static async getById(id, actor) {
    const requiredPermission = 'users.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission users.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const res = await pool.query('SELECT * FROM specializations WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async create(fields, actor) {
    const requiredPermission = 'users.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission users.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name || !fields.code) { const err = new Error('Missing required fields: name, code'); err.statusCode = 400; throw err; }
    const q = `INSERT INTO specializations (name, code, description, order_index) VALUES ($1,$2,$3,$4) RETURNING *`;
    const vals = [fields.name, fields.code, fields.description || null, fields.order_index || 0];
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async update(id, fields, actor) {
    const requiredPermission = 'users.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission users.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','order_index'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) {
      const r = await pool.query('SELECT * FROM specializations WHERE id = $1 LIMIT 1', [Number(id)]);
      return r.rows[0] || null;
    }
    const q = `UPDATE specializations SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async delete(id, actor) {
    const requiredPermission = 'users.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission users.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const res = await pool.query('DELETE FROM specializations WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = SpecializationsService;
