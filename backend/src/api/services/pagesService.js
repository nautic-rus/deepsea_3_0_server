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
  // Simple in-memory cache: key -> { pages, expiresAt }
  static _cache = new Map();
  static _cacheTtlMs = 30 * 1000; // 30 seconds

  static _cacheKeyForUser(user) {
    return `user:${user.id}`;
  }

  static async getPagesForUser(user) {
    if (!user || !user.id) {
      const err = new Error('Authentication required'); err.statusCode = 401; throw err;
    }

    const key = this._cacheKeyForUser(user);
    const now = Date.now();
    const entry = this._cache.get(key);
    if (entry && entry.expiresAt > now) {
      return entry.pages;
    }

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
        order: r.order_index,
        icon: r.icon,
        featureFlag: r.feature_flag,
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
    async function filterAndSanitize(node) {
      // check permissions for this node
      let allowed = false;
      if (!node.permissions || node.permissions.length === 0) allowed = true;
      else {
        for (const perm of node.permissions) {
          if (await hasPermission(user, perm)) { allowed = true; break; }
        }
      }
      if (!allowed) return null;

      const out = {
        id: node.id,
        path: node.path,
        titleKey: node.titleKey,
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

    this._cache.set(key, { pages: sanitized, expiresAt: now + this._cacheTtlMs });
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
