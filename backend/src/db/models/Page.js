/**
 * Page model
 * Stores UI pages and their required permissions.
 */
const pool = require('../connection');

class Page {
  /**
   * List pages with aggregated permission codes.
   * Returns rows with: id, key, path, title_key, parent_id, icon, order_index, permissions (array)
   */
  static async listAllWithPermissions() {
    // Some deployments may have added a 'main_menu' boolean column to pages.
    // We first detect whether the column exists and then select it if present.
    const colCheck = `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'pages' AND column_name = 'main_menu'
      LIMIT 1
    `;
    const colRes = await pool.query(colCheck);
    const hasMainMenu = colRes.rowCount > 0;

    if (hasMainMenu) {
      const q = `
        SELECT p.id, p.key, p.path, p.key AS title_key, NULL::text AS title_en, p.parent_id, p.icon, p.order_index,
          p.main_menu AS main_menu,
          COALESCE(array_agg(pp_code.code) FILTER (WHERE pp_code.code IS NOT NULL), ARRAY[]::text[]) AS permissions
        FROM pages p
        LEFT JOIN (
          SELECT pp.page_id, pr.code
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
        COALESCE(array_agg(pp_code.code) FILTER (WHERE pp_code.code IS NOT NULL), ARRAY[]::text[]) AS permissions
      FROM pages p
      LEFT JOIN (
        SELECT pp.page_id, pr.code
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
}

module.exports = Page;
