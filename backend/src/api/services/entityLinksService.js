const EntityLink = require('../../db/models/EntityLink');
const { hasPermission } = require('./permissionChecker');

class EntityLinksService {
  /**
  * Create a new entity link.
  * fields: { active_type, active_id, passive_type, passive_id, relation_type }
   */
  static async createLink(fields = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'issues.create');
    if (!allowed) { const err = new Error('Forbidden: missing permission links.create'); err.statusCode = 403; throw err; }

    if (!fields || !fields.active_type || !fields.passive_type || !fields.active_id || !fields.passive_id) {
      const err = new Error('Missing required fields'); err.statusCode = 400; throw err;
    }

    // Basic normalization
    const payload = {
      active_type: String(fields.active_type),
      active_id: Number(fields.active_id),
      passive_type: String(fields.passive_type),
      passive_id: Number(fields.passive_id),
      relation_type: fields.relation_type ? String(fields.relation_type) : 'relates',
      created_by: actor.id
    };

    // Prevent duplicate links between the same two entities regardless of order.
    // Note: we consider the pair (type+id) unordered — if any existing link
    // connects these two entities in either direction, treat as duplicate.
    try {
      const existsA = await EntityLink.find({ active_type: payload.active_type, active_id: payload.active_id, passive_type: payload.passive_type, passive_id: payload.passive_id });
      const existsB = await EntityLink.find({ active_type: payload.passive_type, active_id: payload.passive_id, passive_type: payload.active_type, passive_id: payload.active_id });
      if ((existsA && existsA.length > 0) || (existsB && existsB.length > 0)) {
        const err = new Error('Conflict: link between these entities already exists');
        err.statusCode = 409;
        throw err;
      }
    } catch (e) {
      // If the lookup fails for some reason, propagate error (it will be handled by caller)
      if (e && e.statusCode === 409) throw e;
      // otherwise continue to creation (but log) - defensive: rethrow to avoid silent creation
      throw e;
    }

    const created = await EntityLink.create(payload);
    return created;
  }

  /**
   * Delete (remove) a link by id
   */
  static async deleteLink(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'issues.delete');
    if (!allowed) { const err = new Error('Forbidden: missing permission links.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await EntityLink.findById(Number(id));
    if (!existing) { const err = new Error('Link not found'); err.statusCode = 404; throw err; }
    await EntityLink.remove(Number(id));
    return { success: true };
  }

  /**
  * List / find links according to provided filters.
  * Accepts filters: id, active_type, active_id, passive_type, passive_id, relation_type, created_by
   */
  static async listLinks(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'issues.view');
    if (!allowed) { const err = new Error('Forbidden: missing permission links.view'); err.statusCode = 403; throw err; }

    const filters = {};
    const mapNum = ['id', 'active_id', 'passive_id', 'created_by'];

    for (const k of Object.keys(query || {})) {
      if (query[k] === undefined || query[k] === null || query[k] === '') continue;
      if (mapNum.includes(k)) {
        // support comma-separated lists
        if (String(query[k]).includes(',')) filters[k] = String(query[k]).split(',').map(v => Number(v));
        else filters[k] = Number(query[k]);
      } else if (k === 'relation_type' || k === 'active_type' || k === 'passive_type') {
        if (String(query[k]).includes(',')) filters[k] = String(query[k]).split(',').map(s => String(s));
        else filters[k] = String(query[k]);
      }
    }

    const rows = await EntityLink.find(filters);
    return rows;
  }
}

module.exports = EntityLinksService;
