/**
 * Page model
 * Stores UI pages and their required permissions.
 */
const pool = require('../connection');
const ProtectionService = require('../../api/services/protectionService');

class Page {
  /**
   * List pages with aggregated permission codes.
   * Returns rows with: id, key, path, title_key, parent_id, icon, order_index, permissions (array)
   */
  static async listAllWithPermissions() {
    // Some deployments may have added a 'main_menu' boolean column to pages.
    // We first detect whether the column exists and then select it if present.
    const colCheck = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'pages' AND column_name IN ('main_menu', 'status')
    `;
    const colRes = await pool.query(colCheck);
    const cols = colRes.rows.map(r => r.column_name);
    const hasMainMenu = cols.includes('main_menu');
    const hasStatus = cols.includes('status');

    if (hasMainMenu) {
      const q = `
        SELECT p.id, p.key, p.path, p.key AS title_key, NULL::text AS title_en, p.parent_id, p.icon, p.order_index,
          p.main_menu AS main_menu,
          ${hasStatus ? 'p.status AS status,' : 'true AS status,'}
          COALESCE(json_agg(pp_code.perm) FILTER (WHERE pp_code.perm IS NOT NULL), '[]'::json) AS permissions
        FROM pages p
        LEFT JOIN (
          SELECT pp.page_id, json_build_object('id', pr.id, 'code', pr.code, 'name', pr.name) AS perm
          FROM page_permissions pp
          JOIN permissions pr ON pp.permission_id = pr.id
        ) pp_code ON pp_code.page_id = p.id
        GROUP BY p.id
        ORDER BY p.order_index NULLS LAST, p.id
      `;
      const res = await pool.query(q);
      return res.rows;
    }

    // Fallback when main_menu column is absent
    const q = `
      SELECT p.id, p.key, p.path, p.key AS title_key, NULL::text AS title_en, p.parent_id, p.icon, p.order_index,
        ${hasStatus ? 'p.status AS status,' : 'true AS status,'}
        COALESCE(json_agg(pp_code.perm) FILTER (WHERE pp_code.perm IS NOT NULL), '[]'::json) AS permissions
      FROM pages p
      LEFT JOIN (
        SELECT pp.page_id, json_build_object('id', pr.id, 'code', pr.code, 'name', pr.name) AS perm
        FROM page_permissions pp
        JOIN permissions pr ON pp.permission_id = pr.id
      ) pp_code ON pp_code.page_id = p.id
      GROUP BY p.id
      ORDER BY p.order_index NULLS LAST, p.id
    `;
    const res = await pool.query(q);
    return res.rows;
  }

  /**
   * Retrieve a single page by key
   */
  static async findByKey(key) {
    const q = `SELECT * FROM pages WHERE key = $1 LIMIT 1`;
    const res = await pool.query(q, [key]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    if (!id) return null;
    const q = `SELECT * FROM pages WHERE id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const q = `INSERT INTO pages (key, path, parent_id, icon, order_index, main_menu, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const params = [
      fields.key || null,
      fields.path || null,
      fields.parent_id || null,
      fields.icon || null,
      fields.order_index || null,
      fields.main_menu === undefined ? null : fields.main_menu,
      fields.status === undefined ? true : !!fields.status
    ];
    const res = await pool.query(q, params);
    return res.rows[0];
  }

  static async update(id, fields) {
    const allowed = ['key', 'path', 'parent_id', 'icon', 'order_index', 'main_menu', 'status'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        sets.push(`${key} = $${idx}`);
        params.push(fields[key]);
        idx++;
      }
    }
    if (sets.length === 0) return Page.findById(id);
    params.push(id);
    const q = `UPDATE pages SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`;
    await pool.query(q, params);
    return Page.findById(id);
  }

  static async softDelete(id) {
    try {
      await ProtectionService.assertNotProtected('pages', Number(id));
      const res = await pool.query("UPDATE pages SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id", [id]);
      if (res.rowCount > 0) return true;
    } catch (e) {
      // ignore and fallback to hard delete
    }
    await ProtectionService.assertNotProtected('pages', Number(id));
    const del = await pool.query('DELETE FROM pages WHERE id = $1', [id]);
    return del.rowCount > 0;
  }
}

module.exports = Page;
