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
        titleKey: r.title_key,
        title: r.title_en || null,
        order: r.order_index,
        icon: r.icon,
        permissions: r.permissions || [],
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
      // check permissions for this node
      let allowed = false;
      // ensure permissions is an array (DB may return different shapes in edge cases)
      const perms = Array.isArray(node.permissions) ? node.permissions : (node.permissions ? [node.permissions] : []);
      if (!perms || perms.length === 0) {
        allowed = true;
        if (debug) console.debug(`pagesService: page ${node.id} allowed (no perms)`);
      } else {
        for (const perm of perms) {
          const ok = await hasPermission(user, perm);
          if (debug) console.debug(`pagesService: checking perm='${perm}' for user=${user.id} => ${ok}`);
          if (ok) { allowed = true; break; }
        }
        if (debug && !allowed) console.debug(`pagesService: page ${node.id} denied (no matching perms)`);
      }
      if (!allowed) return null;

      const out = {
        id: node.id,
        path: node.path,
        titleKey: node.titleKey,
        title: node.title || undefined,
        order: node.order,
        icon: node.icon
      };
      if (node.children && node.children.length > 0) {
        const children = [];
        for (const ch of node.children) {
          const childOut = await filterAndSanitize(ch);
          if (childOut) children.push(childOut);
        }
        if (children.length) out.children = children;
      }
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
    if (!page.permissions || page.permissions.length === 0) return true;
    // allow if user has at least one of the permissions listed
    for (const perm of page.permissions) {
      if (await hasPermission(user, perm)) return true;
    }
    return false;
  }
}

module.exports = PagesService;
