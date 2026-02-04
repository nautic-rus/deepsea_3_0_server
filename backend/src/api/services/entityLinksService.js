const EntityLink = require('../../db/models/EntityLink');
const { hasPermission } = require('./permissionChecker');

class EntityLinksService {
  /**
   * Create a new entity link.
   * fields: { source_type, source_id, target_type, target_id, relation_type, blocks_closure }
   */
  static async createLink(fields = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'issues.create');
    if (!allowed) { const err = new Error('Forbidden: missing permission links.create'); err.statusCode = 403; throw err; }

    if (!fields || !fields.source_type || !fields.target_type || !fields.source_id || !fields.target_id) {
      const err = new Error('Missing required fields'); err.statusCode = 400; throw err;
    }

    // Basic normalization
    const payload = {
      source_type: String(fields.source_type),
      source_id: Number(fields.source_id),
      target_type: String(fields.target_type),
      target_id: Number(fields.target_id),
      relation_type: fields.relation_type ? String(fields.relation_type) : 'relates',
      blocks_closure: !!fields.blocks_closure,
      created_by: actor.id
    };

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
   * Accepts filters: id, source_type, source_id, target_type, target_id, relation_type, created_by, blocks_closure
   */
  static async listLinks(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'issues.view');
    if (!allowed) { const err = new Error('Forbidden: missing permission links.view'); err.statusCode = 403; throw err; }

    const filters = {};
    const mapNum = ['id', 'source_id', 'target_id', 'created_by'];
    const mapBool = ['blocks_closure'];

    for (const k of Object.keys(query || {})) {
      if (query[k] === undefined || query[k] === null || query[k] === '') continue;
      if (mapNum.includes(k)) {
        // support comma-separated lists
        if (String(query[k]).includes(',')) filters[k] = String(query[k]).split(',').map(v => Number(v));
        else filters[k] = Number(query[k]);
      } else if (mapBool.includes(k)) {
        const v = String(query[k]).toLowerCase();
        filters[k] = (v === 'true' || v === '1');
      } else if (k === 'relation_type' || k === 'source_type' || k === 'target_type') {
        if (String(query[k]).includes(',')) filters[k] = String(query[k]).split(',').map(s => String(s));
        else filters[k] = String(query[k]);
      }
    }

    const rows = await EntityLink.find(filters);
    return rows;
  }
}

module.exports = EntityLinksService;
