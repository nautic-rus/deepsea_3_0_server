const WikiSection = require('../../db/models/WikiSection');
const Project = require('../../db/models/Project');
const { hasPermission } = require('./permissionChecker');
const UserModel = require('../../db/models/User');

function normalizeIntArray(value) {
  if (value === undefined) return undefined;
  if (value === null) return [];

  let arr = [];
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === 'string') {
    if (value.trim() === '') return [];
    arr = value.split(',').map((v) => v.trim());
  } else {
    arr = [value];
  }

  const out = arr.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(out)];
}

class WikiSectionsService {
  static async _enrichCreatedByForSections(items) {
    if (!Array.isArray(items)) return items;
    const userIds = [...new Set(items.map((it) => (it && it.created_by ? Number(it.created_by) : null)).filter(Boolean))];
    const usersById = {};
    await Promise.all(userIds.map(async (uid) => {
      try {
        const u = await UserModel.findById(Number(uid));
        if (u) usersById[Number(uid)] = { id: u.id, avatar_id: u.avatar_id || null, full_name: `${(u.last_name || '').trim()} ${(u.first_name || '').trim()} ${(u.middle_name || '').trim()}`.trim() };
      } catch (e) { /* ignore */ }
    }));

    return items.map((it) => {
      if (!it) return it;
      const cb = it.created_by ? usersById[Number(it.created_by)] || null : null;
      const out = Object.assign({}, it);
      delete out.created_by;
      out.created_by = cb;
      return out;
    });
  }
  static async getActorProjectScope(actor) {
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    const assignedProjectIds = canViewAll ? [] : await Project.listAssignedProjectIds(actor.id);
    return { canViewAll, assignedProjectIds };
  }

  static canAccessSection(section, actor, assignedProjectIds, canViewAll) {
    if (!section) return false;

    const isAuthor = Number(section.created_by) === Number(actor.id);
    const sectionOrgIds = Array.isArray(section.organizations)
      ? section.organizations.map((o) => Number(o.id)).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    const sectionProjectIds = Array.isArray(section.projects)
      ? section.projects.map((p) => Number(p.id)).filter((n) => Number.isInteger(n) && n > 0)
      : [];

    if (!isAuthor && sectionOrgIds.length > 0) {
      if (!actor.organization_id || !sectionOrgIds.includes(Number(actor.organization_id))) return false;
    }

    if (!isAuthor && sectionProjectIds.length > 0 && !canViewAll) {
      const assignedSet = new Set((assignedProjectIds || []).map((v) => Number(v)));
      const hasIntersection = sectionProjectIds.some((pid) => assignedSet.has(Number(pid)));
      if (!hasIntersection) return false;
    }

    return true;
  }

  static async validateTargetScopes(actor, projectIds, organizationIds, canViewAll, assignedProjectIds) {
    if (Array.isArray(projectIds) && projectIds.length > 0 && !canViewAll) {
      const assignedSet = new Set((assignedProjectIds || []).map((v) => Number(v)));
      const forbiddenProject = projectIds.find((pid) => !assignedSet.has(Number(pid)));
      if (forbiddenProject) {
        const err = new Error('Forbidden: user not assigned to one or more requested projects');
        err.statusCode = 403;
        throw err;
      }
    }

    if (Array.isArray(organizationIds) && organizationIds.length > 0) {
      // Organization scope restriction removed: allow setting organization ids
      // even if actor is not a member of them.
    }
  }

  static async listSections(query = {}, actor) {
    const requiredPermission = 'wiki.sections.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.view'); err.statusCode = 403; throw err; }

    const q = Object.assign({}, query);

    if (q.project_id !== undefined && q.project_id !== null && q.project_id !== '' && q.project_id !== 'null') {
      q.project_id = Number(q.project_id);
    }
    if (q.organization_id !== undefined && q.organization_id !== null && q.organization_id !== '') {
      q.organization_id = Number(q.organization_id);
    }
    q.project_ids = normalizeIntArray(q.project_ids);
    q.organization_ids = normalizeIntArray(q.organization_ids);

    const { canViewAll, assignedProjectIds } = await WikiSectionsService.getActorProjectScope(actor);

    const explicitProjectIds = [
      ...(q.project_id !== undefined && q.project_id !== null && q.project_id !== '' && q.project_id !== 'null' ? [Number(q.project_id)] : []),
      ...(Array.isArray(q.project_ids) ? q.project_ids : [])
    ];
    const explicitOrganizationIds = [
      ...(q.organization_id !== undefined && q.organization_id !== null ? [Number(q.organization_id)] : []),
      ...(Array.isArray(q.organization_ids) ? q.organization_ids : [])
    ];

    await WikiSectionsService.validateTargetScopes(actor, explicitProjectIds, explicitOrganizationIds, canViewAll, assignedProjectIds);

    q.viewer_id = actor.id;
    q.viewer_project_ids = canViewAll ? undefined : assignedProjectIds;
    q.viewer_organization_id = actor.organization_id !== undefined ? actor.organization_id : null;

    const rows = await WikiSection.list(q);
    const visible = rows.filter((s) => WikiSectionsService.canAccessSection(s, actor, assignedProjectIds, canViewAll));

    // Exclude sections whose parent is inaccessible to the actor.
    // For each visible section with a parent_id, ensure the parent is accessible.
    const parentIds = [...new Set(visible.filter(s => s && s.parent_id).map(s => Number(s.parent_id)))];
    const parentMap = {};
    await Promise.all(parentIds.map(async (pid) => {
      try {
        const p = await WikiSection.findById(Number(pid));
        parentMap[Number(pid)] = p || null;
      } catch (e) { parentMap[Number(pid)] = null; }
    }));

    const filtered = visible.filter((s) => {
      if (!s || !s.parent_id) return true;
      const parent = parentMap[Number(s.parent_id)] || null;
      if (!parent) return false;
      return WikiSectionsService.canAccessSection(parent, actor, assignedProjectIds, canViewAll);
    });

    return await WikiSectionsService._enrichCreatedByForSections(filtered);
  }

  static async getSectionById(id, actor) {
    const requiredPermission = 'wiki.sections.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const s = await WikiSection.findById(Number(id));
    if (!s) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }

    const { canViewAll, assignedProjectIds } = await WikiSectionsService.getActorProjectScope(actor);
    if (!WikiSectionsService.canAccessSection(s, actor, assignedProjectIds, canViewAll)) {
      const err = new Error('Forbidden: no access to this section scope');
      err.statusCode = 403;
      throw err;
    }

    const enriched = (await WikiSectionsService._enrichCreatedByForSections([s]))[0];
    return enriched;
  }

  static async createSection(fields, actor) {
    const requiredPermission = 'wiki.sections.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }

    const payload = Object.assign({}, fields);
    const sectionProjectIds = normalizeIntArray(payload.projects !== undefined ? payload.projects : (payload.project_ids !== undefined ? payload.project_ids : payload.project_id));
    const sectionOrganizationIds = normalizeIntArray(payload.organizations !== undefined ? payload.organizations : (payload.organization_ids !== undefined ? payload.organization_ids : payload.organization_id));

    const { canViewAll, assignedProjectIds } = await WikiSectionsService.getActorProjectScope(actor);
    await WikiSectionsService.validateTargetScopes(actor, sectionProjectIds, sectionOrganizationIds, canViewAll, assignedProjectIds);

    if (sectionProjectIds !== undefined) payload.projects = sectionProjectIds;
    if (sectionOrganizationIds !== undefined) payload.organizations = sectionOrganizationIds;
    if (!payload.created_by) payload.created_by = actor.id;

    const created = await WikiSection.create(payload);
    const enriched = (await WikiSectionsService._enrichCreatedByForSections([created]))[0];
    return enriched;
  }

  static async updateSection(id, fields, actor) {
    const requiredPermission = 'wiki.sections.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await WikiSection.findById(Number(id));
    if (!existing) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }

    const { canViewAll, assignedProjectIds } = await WikiSectionsService.getActorProjectScope(actor);
    if (!WikiSectionsService.canAccessSection(existing, actor, assignedProjectIds, canViewAll)) {
      const err = new Error('Forbidden: no access to this section scope');
      err.statusCode = 403;
      throw err;
    }

    const payload = Object.assign({}, fields);
    const hasProjectInput = Object.prototype.hasOwnProperty.call(payload, 'projects') || Object.prototype.hasOwnProperty.call(payload, 'project_ids') || Object.prototype.hasOwnProperty.call(payload, 'project_id');
    const hasOrgInput = Object.prototype.hasOwnProperty.call(payload, 'organizations') || Object.prototype.hasOwnProperty.call(payload, 'organization_ids') || Object.prototype.hasOwnProperty.call(payload, 'organization_id');

    const sectionProjectIds = hasProjectInput
      ? normalizeIntArray(payload.projects !== undefined ? payload.projects : (payload.project_ids !== undefined ? payload.project_ids : payload.project_id))
      : undefined;
    const sectionOrganizationIds = hasOrgInput
      ? normalizeIntArray(payload.organizations !== undefined ? payload.organizations : (payload.organization_ids !== undefined ? payload.organization_ids : payload.organization_id))
      : undefined;

    if (hasProjectInput || hasOrgInput) {
      await WikiSectionsService.validateTargetScopes(actor, sectionProjectIds, sectionOrganizationIds, canViewAll, assignedProjectIds);
    }

    if (sectionProjectIds !== undefined) payload.projects = sectionProjectIds;
    if (sectionOrganizationIds !== undefined) payload.organizations = sectionOrganizationIds;

    const updated = await WikiSection.update(Number(id), payload);
    if (!updated) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    const enriched = (await WikiSectionsService._enrichCreatedByForSections([updated]))[0];
    return enriched;
  }

  static async deleteSection(id, actor) {
    const requiredPermission = 'wiki.sections.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.sections.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await WikiSection.findById(Number(id));
    if (!existing) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    const { canViewAll, assignedProjectIds } = await WikiSectionsService.getActorProjectScope(actor);
    if (!WikiSectionsService.canAccessSection(existing, actor, assignedProjectIds, canViewAll)) {
      const err = new Error('Forbidden: no access to this section scope');
      err.statusCode = 403;
      throw err;
    }

    const ok = await WikiSection.softDelete(Number(id));
    if (!ok) { const err = new Error('Section not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = WikiSectionsService;
