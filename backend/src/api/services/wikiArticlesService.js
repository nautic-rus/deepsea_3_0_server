const WikiArticle = require('../../db/models/WikiArticle');
const WikiArticleView = require('../../db/models/WikiArticleView');
const WikiArticleFavorite = require('../../db/models/WikiArticleFavorite');
const WikiSection = require('../../db/models/WikiSection');
const Project = require('../../db/models/Project');
const { hasPermission } = require('./permissionChecker');

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

class WikiArticlesService {
  static async getActorProjectScope(actor) {
    const canViewAll = await hasPermission(actor, 'projects.view_all');
    const assignedProjectIds = canViewAll ? [] : await Project.listAssignedProjectIds(actor.id);
    return { canViewAll, assignedProjectIds };
  }

  static canAccessScopedEntity(entity, actor, assignedProjectIds, canViewAll) {
    if (!entity) return false;

    const isAuthor = Number(entity.created_by) === Number(actor.id);
    const orgIds = Array.isArray(entity.organizations)
      ? entity.organizations.map((o) => Number(o.id)).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    const projectIds = Array.isArray(entity.projects)
      ? entity.projects.map((p) => Number(p.id)).filter((n) => Number.isInteger(n) && n > 0)
      : [];

    if (!isAuthor && orgIds.length > 0) {
      if (!actor.organization_id || !orgIds.includes(Number(actor.organization_id))) return false;
    }

    if (!isAuthor && projectIds.length > 0 && !canViewAll) {
      const assignedSet = new Set((assignedProjectIds || []).map((v) => Number(v)));
      const hasIntersection = projectIds.some((pid) => assignedSet.has(Number(pid)));
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
      const actorOrgId = actor.organization_id ? Number(actor.organization_id) : null;
      if (!actorOrgId || !organizationIds.includes(actorOrgId)) {
        const err = new Error('Forbidden: user is not a member of one or more requested organizations');
        err.statusCode = 403;
        throw err;
      }
    }
  }

  static async assertCanAccessSection(sectionId, actor, assignedProjectIds, canViewAll) {
    const section = await WikiSection.findById(Number(sectionId));
    if (!section) {
      const err = new Error('Section not found');
      err.statusCode = 404;
      throw err;
    }
    if (!WikiArticlesService.canAccessScopedEntity(section, actor, assignedProjectIds, canViewAll)) {
      const err = new Error('Forbidden: no access to selected section scope');
      err.statusCode = 403;
      throw err;
    }
  }

  static async listArticles(query = {}, actor) {
    const requiredPermission = 'wiki.articles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.view'); err.statusCode = 403; throw err; }

    const q = Object.assign({}, query);
    if (q.organization_id !== undefined && q.organization_id !== null && q.organization_id !== '') q.organization_id = Number(q.organization_id);
    if (q.project_id !== undefined && q.project_id !== null && q.project_id !== '') q.project_id = Number(q.project_id);
    q.organization_ids = normalizeIntArray(q.organization_ids);
    q.project_ids = normalizeIntArray(q.project_ids);

    const { canViewAll, assignedProjectIds } = await WikiArticlesService.getActorProjectScope(actor);

    const explicitProjectIds = [
      ...(q.project_id !== undefined && q.project_id !== null ? [Number(q.project_id)] : []),
      ...(Array.isArray(q.project_ids) ? q.project_ids : [])
    ];
    const explicitOrganizationIds = [
      ...(q.organization_id !== undefined && q.organization_id !== null ? [Number(q.organization_id)] : []),
      ...(Array.isArray(q.organization_ids) ? q.organization_ids : [])
    ];
    await WikiArticlesService.validateTargetScopes(actor, explicitProjectIds, explicitOrganizationIds, canViewAll, assignedProjectIds);

    q.viewer_id = actor.id;
    q.viewer_organization_id = actor.organization_id !== undefined ? actor.organization_id : null;
    q.viewer_project_ids = canViewAll ? undefined : assignedProjectIds;

    const rows = await WikiArticle.list(q);
    const visibleRows = rows.filter((a) => WikiArticlesService.canAccessScopedEntity(a, actor, assignedProjectIds, canViewAll));

    const articleIds = visibleRows.map((r) => Number(r.id)).filter((v) => !Number.isNaN(v));
    if (articleIds.length === 0) return visibleRows;

    const favRows = await WikiArticleFavorite.listByUserAndArticleIds(actor.id, articleIds);
    const favSet = new Set(favRows.map((r) => Number(r.article_id)));
    return visibleRows.map((r) => Object.assign({}, r, { is_favorite: favSet.has(Number(r.id)) }));
  }

  static async getArticleById(id, actor) {
    const requiredPermission = 'wiki.articles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const a = await WikiArticle.findById(Number(id));
    if (!a) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }

    const { canViewAll, assignedProjectIds } = await WikiArticlesService.getActorProjectScope(actor);
    if (!WikiArticlesService.canAccessScopedEntity(a, actor, assignedProjectIds, canViewAll)) {
      const err = new Error('Forbidden: no access to this article scope');
      err.statusCode = 403;
      throw err;
    }

    const favorite = await WikiArticleFavorite.findByUserAndArticle(actor.id, Number(id));
    a.is_favorite = !!favorite;

    // Log view for authenticated user; ignore errors from logging
    if (actor && actor.id) {
      (async () => {
        try { await WikiArticleView.create({ user_id: actor.id, article_id: Number(id) }); } catch (e) { /* ignore */ }
      })();
    }
    return a;
  }

  static async createArticle(fields, actor) {
    const requiredPermission = 'wiki.articles.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.title || !fields.content || !fields.section_id) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }

    const payload = Object.assign({}, fields);
    const articleOrganizationIds = normalizeIntArray(payload.organizations !== undefined ? payload.organizations : payload.organization_ids);
    const articleProjectIds = normalizeIntArray(payload.projects !== undefined ? payload.projects : payload.project_ids);

    const { canViewAll, assignedProjectIds } = await WikiArticlesService.getActorProjectScope(actor);
    await WikiArticlesService.validateTargetScopes(actor, articleProjectIds, articleOrganizationIds, canViewAll, assignedProjectIds);
    await WikiArticlesService.assertCanAccessSection(payload.section_id, actor, assignedProjectIds, canViewAll);

    if (articleOrganizationIds !== undefined) payload.organizations = articleOrganizationIds;
    if (articleProjectIds !== undefined) payload.projects = articleProjectIds;
    if (!payload.created_by) payload.created_by = actor.id;

    return await WikiArticle.create(payload);
  }

  static async updateArticle(id, fields, actor) {
    const requiredPermission = 'wiki.articles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await WikiArticle.findById(Number(id));
    if (!existing) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }

    const { canViewAll, assignedProjectIds } = await WikiArticlesService.getActorProjectScope(actor);
    if (!WikiArticlesService.canAccessScopedEntity(existing, actor, assignedProjectIds, canViewAll)) {
      const err = new Error('Forbidden: no access to this article scope');
      err.statusCode = 403;
      throw err;
    }

    const payload = Object.assign({}, fields);
    const hasOrganizationsInput = Object.prototype.hasOwnProperty.call(payload, 'organizations') || Object.prototype.hasOwnProperty.call(payload, 'organization_ids');
    const hasProjectsInput = Object.prototype.hasOwnProperty.call(payload, 'projects') || Object.prototype.hasOwnProperty.call(payload, 'project_ids');

    const articleOrganizationIds = hasOrganizationsInput
      ? normalizeIntArray(payload.organizations !== undefined ? payload.organizations : payload.organization_ids)
      : undefined;
    const articleProjectIds = hasProjectsInput
      ? normalizeIntArray(payload.projects !== undefined ? payload.projects : payload.project_ids)
      : undefined;

    if (payload.section_id !== undefined && payload.section_id !== null) {
      await WikiArticlesService.assertCanAccessSection(payload.section_id, actor, assignedProjectIds, canViewAll);
    }

    if (hasOrganizationsInput || hasProjectsInput) {
      await WikiArticlesService.validateTargetScopes(actor, articleProjectIds, articleOrganizationIds, canViewAll, assignedProjectIds);
    }

    if (articleOrganizationIds !== undefined) payload.organizations = articleOrganizationIds;
    if (articleProjectIds !== undefined) payload.projects = articleProjectIds;

    const updated = await WikiArticle.update(Number(id), payload);
    if (!updated) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteArticle(id, actor) {
    const requiredPermission = 'wiki.articles.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission wiki.articles.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }

    const existing = await WikiArticle.findById(Number(id));
    if (!existing) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
    const { canViewAll, assignedProjectIds } = await WikiArticlesService.getActorProjectScope(actor);
    if (!WikiArticlesService.canAccessScopedEntity(existing, actor, assignedProjectIds, canViewAll)) {
      const err = new Error('Forbidden: no access to this article scope');
      err.statusCode = 403;
      throw err;
    }

    const ok = await WikiArticle.softDelete(Number(id));
    if (!ok) { const err = new Error('Article not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = WikiArticlesService;
