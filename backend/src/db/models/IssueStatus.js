const pool = require('../connection');
const ProtectionService = require('../../api/services/protectionService');

class IssueStatus {
  static async list() {
    const res = await pool.query('SELECT * FROM issue_status ORDER BY COALESCE(order_index,0), id');
    return res.rows || [];
  }

  static async findById(id) {
    const res = await pool.query('SELECT * FROM issue_status WHERE id = $1 LIMIT 1', [Number(id)]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const cols = ['name','code','description','color','is_initial','is_final','order_index'];
    const vals = [fields.name, fields.code, fields.description || null, fields.color || null, !!fields.is_initial, !!fields.is_final, fields.order_index || 0];
    const q = `INSERT INTO issue_status (${cols.join(',')}) VALUES (${cols.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async update(id, fields) {
    const parts = [];
    const vals = [];
    let idx = 1;
    ['name','code','description','color','is_initial','is_final','order_index'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(fields[k]); }
    });
    if (parts.length === 0) return await IssueStatus.findById(id);
    const q = `UPDATE issue_status SET ${parts.join(', ')} WHERE id = $${idx} RETURNING *`;
    vals.push(Number(id));
    const res = await pool.query(q, vals);
    return res.rows[0] || null;
  }

  static async delete(id) {
    await ProtectionService.assertNotProtected('issue_status', Number(id));
    const res = await pool.query('DELETE FROM issue_status WHERE id = $1 RETURNING id', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = IssueStatus;
