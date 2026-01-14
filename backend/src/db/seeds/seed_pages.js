/**
 * Idempotent seed for pages and page_permissions.
 * Run from backend/: node src/db/seeds/seed_pages.js
 */
const pool = require('../connection');

// Define pages with optional parentKey and permission codes
const PAGES = [
  { key: 'dashboard', path: '/dashboard', title_key: 'menu.dashboard', permissions: [] },
  { key: 'projects', path: '/projects', title_key: 'menu.projects', permissions: ['projects.view'] },
  { key: 'project-details', path: '/projects/:id', title_key: 'menu.projectDetails', permissions: ['projects.view'], parentKey: 'projects' },
  { key: 'documents', path: '/documents', title_key: 'menu.documents', permissions: ['documents.view'] },
  { key: 'users', path: '/admin/users', title_key: 'menu.users', permissions: ['users.view'] }
];

async function upsertPages() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure pages exist
    const keyToId = {};
    for (const p of PAGES) {
      const res = await client.query('SELECT id FROM pages WHERE key = $1 LIMIT 1', [p.key]);
      let id;
      if (res.rowCount > 0) {
        id = res.rows[0].id;
        // Optionally update path/title
        await client.query('UPDATE pages SET path = $1, title_key = $2 WHERE id = $3', [p.path, p.title_key || null, id]);
      } else {
        const ins = await client.query('INSERT INTO pages (key, path, title_key, icon, order_index, feature_flag) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [p.key, p.path, p.title_key || null, null, 0, null]);
        id = ins.rows[0].id;
      }
      keyToId[p.key] = id;
    }

    // Set parents
    for (const p of PAGES) {
      if (p.parentKey) {
        const parentId = keyToId[p.parentKey];
        const pageId = keyToId[p.key];
        if (parentId && pageId) {
          await client.query('UPDATE pages SET parent_id = $1 WHERE id = $2', [parentId, pageId]);
        }
      }
    }

    // Map permissions
    for (const p of PAGES) {
      const pageId = keyToId[p.key];
      if (!p.permissions || p.permissions.length === 0) continue;
      for (const permCode of p.permissions) {
        const perm = await client.query('SELECT id FROM permissions WHERE code = $1 LIMIT 1', [permCode]);
        if (perm.rowCount === 0) {
          console.warn(`Permission not found, skipping mapping: ${permCode}`);
          continue;
        }
        const permId = perm.rows[0].id;
        // insert mapping if not exists
        await client.query('INSERT INTO page_permissions (page_id, permission_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM page_permissions WHERE page_id = $1 AND permission_id = $2)', [pageId, permId]);
      }
    }

    await client.query('COMMIT');
    console.log('Pages seed completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Pages seed failed:', err.message);
  } finally {
    client.release();
    try { await pool.end(); } catch (e) { /* ignore */ }
  }
}

if (require.main === module) {
  upsertPages().catch(() => process.exit(1));
}

module.exports = { PAGES };
