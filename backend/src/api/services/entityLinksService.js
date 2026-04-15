const EntityLink = require('../../db/models/EntityLink');
const Issue = require('../../db/models/Issue'); // No change, keeping for context
const Document = require('../../db/models/Document');
const CustomerQuestion = require('../../db/models/CustomerQuestion');
const Project = require('../../db/models/Project');
const IssueStatus = require('../../db/models/IssueStatus');
const DocumentStatus = require('../../db/models/DocumentStatus');
const { hasPermission, hasPermissionForProject } = require('./permissionChecker');
const IssueType = require('../../db/models/IssueType');
const DocumentType = require('../../db/models/DocumentType');

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

    // Prevent linking an entity to itself (same type and same id)
    if (payload.active_type === payload.passive_type && payload.active_id === payload.passive_id) {
      const err = new Error('Invalid link: cannot link an entity to itself');
      err.statusCode = 400;
      throw err;
    }

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

    // Enrich each link with the full entity data for active and passive sides.
    // Resolve each referenced entity from its corresponding table based on type.
    const cache = {};
    const rawCache = {};
    const permissionCache = {};

    const normalize = async (type, data) => {
      if (!data) return null;
      if (type === 'issue') {
        let status = null;
        let project = null;
        let typeName = null;
        if (data.status_id) {
          try { status = await IssueStatus.findById(data.status_id); } catch (e) { status = null; }
        }
        if (data.type_id) {
          try { const t = await IssueType.findById(data.type_id); if (t) typeName = t.name || null; } catch (e) { typeName = null; }
        }
        if (data.project_id) {
          try { const p = await Project.findById(data.project_id); if (p) project = { id: p.id, code: p.code || null, name: p.name || null }; } catch (e) { project = { id: data.project_id }; }
        }
        return {
          id: data.id,
          type: typeName,
          title: data.title || null,
          description: data.description || null,
          project: project,
          created_at: data.created_at || null,
          code: data.code || null,
          status: status ? { name: status.name || null, code: status.code || null } : null,
        };
      }
      if (type === 'document') {
        let status = null;
        let project = null;
        let typeName = null;
        if (data.status_id) {
          try { status = await DocumentStatus.findById(data.status_id); } catch (e) { status = null; }
        }
        if (data.type_id) {
          try { const t = await DocumentType.findById(data.type_id); if (t) typeName = t.name || null; } catch (e) { typeName = null; }
        }
        if (data.project_id) {
          try { const p = await Project.findById(data.project_id); if (p) project = { id: p.id, code: p.code || null, name: p.name || null }; } catch (e) { project = { id: data.project_id }; }
        }
        return {
          id: data.id,
          type: typeName,
          title: data.title || null,
          description: data.description || data.comment || null,
          project: project,
          created_at: data.created_at || null,
          code: data.code || null,
          status: status ? { name: status.name || null, code: status.code || null } : null,
        };
      }
      if (type === 'qna') {
        const st = data.status || null;
        const typeName = (data.type && data.type.name) ? data.type.name : null;
        return {
          id: data.id,
          type: typeName,
          title: data.question_title || null,
          description: data.question_text || null,
          project: data.project || null,
          created_at: data.created_at || null,
          code: data.code || null,
          status: st ? { name: st.name || null, code: st.code || null } : null,
        };
      }
      if (type === 'customer_question') {
        const st = data.status || null;
        const typeName = (data.type && data.type.name) ? data.type.name : null;
        return {
          id: data.id,
          type: typeName,
          title: data.question_title || null,
          description: data.question_text || null,
          project: data.project || null,
          created_at: data.created_at || null,
          code: data.code || null,
          status: st ? { name: st.name || null, code: st.code || null } : null,
        };
      }
      return null;
    };

    const fetchEntityRaw = async (type, id) => {
      if (!type || !id) return null;
      const key = `${type}:${id}`;
      if (Object.prototype.hasOwnProperty.call(rawCache, key)) return rawCache[key];
      try {
        let res = null;
        if (type === 'issue') res = await Issue.findById(id);
        else if (type === 'document') res = await Document.findById(id);
        else if (type === 'qna' || type === 'customer_question') res = await CustomerQuestion.findById(id);
        else res = null;
        rawCache[key] = res || null;
        return rawCache[key];
      } catch (e) {
        rawCache[key] = null;
        return null;
      }
    };

    const fetchEntity = async (type, id) => {
      if (!type || !id) return null;
      const key = `${type}:${id}`;
      if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key];
      const raw = await fetchEntityRaw(type, id);
      cache[key] = await normalize(type, raw);
      return cache[key];
    };

    const canViewEntity = async (type, id) => {
      // Keep backward compatibility for unknown entity types.
      if (!type || !id) return false;

      let permissionCode = null;
      if (type === 'issue') permissionCode = 'issues.view';
      else if (type === 'document') permissionCode = 'documents.view';
      else if (type === 'qna' || type === 'customer_question') permissionCode = 'customer_questions.view';
      else return true;

      const raw = await fetchEntityRaw(type, id);
      if (!raw) return false;

      const projectId = raw.project_id || (raw.project && raw.project.id ? raw.project.id : null);
      const cacheKey = `${permissionCode}:${projectId || 'global'}`;
      if (Object.prototype.hasOwnProperty.call(permissionCache, cacheKey)) return permissionCache[cacheKey];

      const allowed = projectId
        ? await hasPermissionForProject(actor, permissionCode, projectId)
        : await hasPermission(actor, permissionCode);
      permissionCache[cacheKey] = !!allowed;
      return permissionCache[cacheKey];
    };

    const enriched = await Promise.all((rows || []).map(async (r) => {
      const canViewActive = await canViewEntity(r.active_type, r.active_id);
      const canViewPassive = await canViewEntity(r.passive_type, r.passive_id);
      if (!canViewActive || !canViewPassive) return null;

      const active_entity = await fetchEntity(r.active_type, r.active_id);
      const passive_entity = await fetchEntity(r.passive_type, r.passive_id);
      return Object.assign({}, r, { active_entity, passive_entity });
    }));

    return enriched.filter(Boolean);
  }
}

module.exports = EntityLinksService;
