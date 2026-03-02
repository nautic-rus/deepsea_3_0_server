const pool = require('../connection');

class PagePermission {
  static async listByPage(pageId) {
    if (!pageId) return [];
    const q = `SELECT pp.id, pp.page_id, pp.permission_id, p.code AS permission_code
               FROM page_permissions pp
               JOIN permissions p ON pp.permission_id = p.id
               WHERE pp.page_id = $1 ORDER BY pp.id`;
    const res = await pool.query(q, [pageId]);
    return res.rows;
  }

  static async listAll() {
    const q = `SELECT pp.id, pp.page_id, pp.permission_id, p.code AS permission_code FROM page_permissions pp JOIN permissions p ON pp.permission_id = p.id ORDER BY pp.id`;
    const res = await pool.query(q);
    return res.rows;
  }

  static async create(pageId, permissionId) {
    const q = `INSERT INTO page_permissions (page_id, permission_id) VALUES ($1, $2) RETURNING id, page_id, permission_id`;
    const res = await pool.query(q, [pageId, permissionId]);
    return res.rows[0];
  }

  static async delete(id) {
    const res = await pool.query('DELETE FROM page_permissions WHERE id = $1', [id]);
    return res.rowCount > 0;
  }
}

module.exports = PagePermission;
