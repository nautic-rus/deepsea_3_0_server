const Page = require('../../db/models/Page');
const { hasPermission } = require('./permissionChecker');

/**
 * PagesService
 *
 * Returns a client-friendly list of pages available to a user.
 * The result is lightly cached in-memory to avoid repeating permission checks
 * on every request. The cache is short-lived and can be replaced by Redis
 * later if desired.
 */
class PagesService {
  // No in-memory caching — always compute pages per request to respect current permissions

  static async getPagesForUser(user) {
    if (!user || !user.id) {
      const err = new Error('Authentication required'); err.statusCode = 401; throw err;
    }

    // Always compute freshly (no cache)

    // load pages from DB (with aggregated permission codes)
    const rows = await Page.listAllWithPermissions();

    // Build tree by parent_id
    const byId = new Map();
    for (const r of rows) {
      byId.set(r.id, {
        id: r.key || `page_${r.id}`,
        dbId: r.id,
        path: r.path,
        // title_key intentionally not exposed in API
        title: r.title_en || null,
        order: r.order_index,
        icon: r.icon,
        permissions: r.permissions || [],
        mainMenu: !!r.main_menu,
        status: typeof r.status === 'undefined' ? true : !!r.status,
        parentId: r.parent_id,
        children: []
      });
    }

    const roots = [];
    for (const item of byId.values()) {
      if (item.parentId) {
        const parent = byId.get(item.parentId);
        if (parent) parent.children.push(item);
        else roots.push(item); // fallback
      } else {
        roots.push(item);
      }
    }

  // filter by permissions
  const allowedPages = [];
  const debug = process.env.DEBUG_PAGES === '1';
    async function filterAndSanitize(node) {
      // exclude pages that are explicitly disabled via `status` flag
      if (node.status === false) return null;
      // check permissions for this node
      let allowed = false;
      // ensure permissions is an array (DB may return different shapes in edge cases)
        const perms = Array.isArray(node.permissions) ? node.permissions : (node.permissions ? [node.permissions] : []);
      if (!perms || perms.length === 0) {
        // If a page has no permissions assigned in page_permissions, deny by default.
        // This prevents returning all pages when page_permissions table is empty.
        allowed = false;
        if (debug) console.debug(`pagesService: page ${node.id} denied (no perms defined)`);
      } else {
          for (const perm of perms) {
            const code = (perm && typeof perm === 'object') ? perm.code : perm;
            const ok = await hasPermission(user, code);
            if (debug) console.debug(`pagesService: checking perm='${code}' for user=${user.id} => ${ok}`);
            if (ok) { allowed = true; break; }
          }
        if (debug && !allowed) console.debug(`pagesService: page ${node.id} denied (no matching perms)`);
      }
      if (!allowed) return null;

      const out = {
        id: node.id,
        path: node.path,
        // titleKey removed from API payload per request
        title: node.title || undefined,
        mainMenu: node.mainMenu,
        status: node.status,
        order: node.order,
        icon: node.icon
      };
        // Do not expose permission metadata to end-user pages endpoint
      if (node.children && node.children.length > 0) {
        const children = [];
        for (const ch of node.children) {
          const childOut = await filterAndSanitize(ch);
          if (childOut) children.push(childOut);
        }
        if (children.length) out.children = children;
      }
      // Note: we no longer exclude pages based on the `main_menu` flag here.
      // The `mainMenu` property is informational for clients (to render main menu)
      // but the /api/user/pages endpoint should return all pages the user has
      // permission to access regardless of that flag.

      return out;
    }

    for (const root of roots) {
      const sanitizedRoot = await filterAndSanitize(root);
      if (sanitizedRoot) allowedPages.push(sanitizedRoot);
    }

    const sanitized = allowedPages;

    return sanitized;
  }

  static async _isPageAllowed(user, page) {
    // If page.permissions is empty, deny by default (explicit permissions required)
    const perms = Array.isArray(page.permissions) ? page.permissions : (page.permissions ? [page.permissions] : []);
    if (!perms || perms.length === 0) return false;
    // allow if user has at least one of the permissions listed
    for (const perm of perms) {
      if (await hasPermission(user, perm)) return true;
    }
    return false;
  }

  // Admin CRUD methods for pages
  static async createPage(fields = {}, actor) {
    const requiredPermission = 'pages.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission pages.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.key) { const err = new Error('Missing page key'); err.statusCode = 400; throw err; }
    const created = await Page.create(fields);
    return created;
  }

  static async updatePage(id, fields = {}, actor) {
    const requiredPermission = 'pages.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission pages.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Page.update(Number(id), fields);
    if (!updated) { const err = new Error('Page not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deletePage(id, actor) {
    const requiredPermission = 'pages.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission pages.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Page.softDelete(Number(id));
    if (!ok) { const err = new Error('Page not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  static async listPages(actor) {
    const requiredPermission = 'pages.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission pages.view'); err.statusCode = 403; throw err; }
    // Return raw rows with aggregated permissions for admin UI
    return Page.listAllWithPermissions();
  }
}

module.exports = PagesService;
