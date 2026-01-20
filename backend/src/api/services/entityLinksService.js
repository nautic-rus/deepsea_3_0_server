const EntityLink = require('../../db/models/EntityLink');
const { hasPermission } = require('./permissionChecker');

class EntityLinksService {
  /**
   * Create a new entity link.
   * fields: { source_type, source_id, target_type, target_id, relation_type, blocks_closure }
   */
  static async createLink(fields = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'links.create');
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
    const allowed = await hasPermission(actor, 'links.delete');
    if (!allowed) { const err = new Error('Forbidden: missing permission links.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const existing = await EntityLink.findById(Number(id));
    if (!existing) { const err = new Error('Link not found'); err.statusCode = 404; throw err; }
    await EntityLink.remove(Number(id));
    return { success: true };
  }
}

module.exports = EntityLinksService;
