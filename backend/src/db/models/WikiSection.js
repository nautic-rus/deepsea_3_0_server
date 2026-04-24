const pool = require('../connection');

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

  const out = arr
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(out)];
}

class WikiSection {
  static async list(filters = {}) {
    const { id, parent_id, name, slug, created_by, project_id, project_ids, organization_id, organization_ids, page = 1, limit } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;

    if (id !== undefined) { where.push(`ws.id = $${idx++}`); values.push(id); }
    if (parent_id !== undefined) { where.push(`ws.parent_id = $${idx++}`); values.push(parent_id); }
    if (created_by !== undefined) { where.push(`ws.created_by = $${idx++}`); values.push(created_by); }

    if (project_id !== undefined) {
      if (project_id === null || project_id === 'null' || project_id === '') {
        where.push(`(to_regclass('public.wiki_section_projects') IS NULL OR NOT EXISTS (SELECT 1 FROM wiki_section_projects wsp WHERE wsp.section_id = ws.id))`);
      } else {
        where.push(`(to_regclass('public.wiki_section_projects') IS NOT NULL AND EXISTS (SELECT 1 FROM wiki_section_projects wsp WHERE wsp.section_id = ws.id AND wsp.project_id = $${idx++}))`);
        values.push(project_id);
      }
    }

    const projectIds = normalizeIntArray(project_ids);
    if (Array.isArray(projectIds) && projectIds.length > 0) {
      where.push(`(to_regclass('public.wiki_section_projects') IS NOT NULL AND EXISTS (SELECT 1 FROM wiki_section_projects wsp WHERE wsp.section_id = ws.id AND wsp.project_id = ANY($${idx}::int[])))`);
      values.push(projectIds);
      idx++;
    }

    if (organization_id !== undefined) {
      where.push(`(to_regclass('public.wiki_section_organizations') IS NOT NULL AND EXISTS (SELECT 1 FROM wiki_section_organizations wso WHERE wso.section_id = ws.id AND wso.organization_id = $${idx++}))`);
      values.push(organization_id);
    }

    const organizationIds = normalizeIntArray(organization_ids);
    if (Array.isArray(organizationIds) && organizationIds.length > 0) {
      where.push(`(to_regclass('public.wiki_section_organizations') IS NOT NULL AND EXISTS (SELECT 1 FROM wiki_section_organizations wso WHERE wso.section_id = ws.id AND wso.organization_id = ANY($${idx}::int[])))`);
      values.push(organizationIds);
      idx++;
    }

    const explicitProjectFilter = project_id !== undefined || (Array.isArray(projectIds) && projectIds.length > 0);
    const explicitOrgFilter = organization_id !== undefined || (Array.isArray(organizationIds) && organizationIds.length > 0);

    if (filters.viewer_id !== undefined && !explicitProjectFilter) {
      const viewerProjectIds = Array.isArray(filters.viewer_project_ids) ? normalizeIntArray(filters.viewer_project_ids) : undefined;
      if (Array.isArray(viewerProjectIds) && viewerProjectIds.length > 0) {
        where.push(`(ws.created_by = $${idx++} OR (to_regclass('public.wiki_section_projects') IS NULL) OR (to_regclass('public.wiki_section_projects') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wiki_section_projects wsp WHERE wsp.section_id = ws.id)) OR EXISTS (SELECT 1 FROM wiki_section_projects wsp WHERE wsp.section_id = ws.id AND wsp.project_id = ANY($${idx}::int[])))`);
        values.push(filters.viewer_id, viewerProjectIds);
        idx++;
      } else {
        where.push(`(ws.created_by = $${idx++} OR (to_regclass('public.wiki_section_projects') IS NULL) OR (to_regclass('public.wiki_section_projects') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wiki_section_projects wsp WHERE wsp.section_id = ws.id)))`);
        values.push(filters.viewer_id);
      }
    }

    if (filters.viewer_id !== undefined && !explicitOrgFilter) {
      if (filters.viewer_organization_id == null) {
        where.push(`(ws.created_by = $${idx++} OR (to_regclass('public.wiki_section_organizations') IS NULL) OR NOT EXISTS (SELECT 1 FROM wiki_section_organizations wso WHERE wso.section_id = ws.id))`);
        values.push(filters.viewer_id);
      } else {
        where.push(`(ws.created_by = $${idx++} OR (to_regclass('public.wiki_section_organizations') IS NULL) OR NOT EXISTS (SELECT 1 FROM wiki_section_organizations wso WHERE wso.section_id = ws.id) OR EXISTS (SELECT 1 FROM wiki_section_organizations wso WHERE wso.section_id = ws.id AND wso.organization_id = $${idx++}))`);
        values.push(filters.viewer_id, filters.viewer_organization_id);
      }
    }

    if (name) { where.push(`ws.name ILIKE $${idx++}`); values.push(`%${name}%`); }
    if (slug) { where.push(`ws.slug = $${idx++}`); values.push(slug); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `SELECT ws.id, ws.name, ws.slug, ws.description, ws.parent_id, ws.order_index, ws.created_by, ws.updated_by, ws.created_at, ws.updated_at,
      (CASE WHEN to_regclass('public.wiki_section_projects') IS NULL THEN NULL ELSE (SELECT json_agg(row_to_json(p.*)) FROM (SELECT p.id, p.name, p.code FROM wiki_section_projects wsp JOIN projects p ON p.id = wsp.project_id WHERE wsp.section_id = ws.id ORDER BY p.id) p) END) AS projects,
      (CASE WHEN to_regclass('public.wiki_section_organizations') IS NULL THEN NULL ELSE (SELECT json_agg(row_to_json(o.*)) FROM (SELECT o.id, o.name FROM wiki_section_organizations wso JOIN organizations o ON o.id = wso.organization_id WHERE wso.section_id = ws.id ORDER BY o.id) o) END) AS organizations
      FROM wiki_sections ws ${whereSql} ORDER BY ws.order_index, ws.id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT ws.id, ws.name, ws.slug, ws.description, ws.parent_id, ws.order_index, ws.created_by, ws.updated_by, ws.created_at, ws.updated_at,
      (CASE WHEN to_regclass('public.wiki_section_projects') IS NULL THEN NULL ELSE (SELECT json_agg(row_to_json(p.*)) FROM (SELECT p.id, p.name, p.code FROM wiki_section_projects wsp JOIN projects p ON p.id = wsp.project_id WHERE wsp.section_id = ws.id ORDER BY p.id) p) END) AS projects,
      (CASE WHEN to_regclass('public.wiki_section_organizations') IS NULL THEN NULL ELSE (SELECT json_agg(row_to_json(o.*)) FROM (SELECT o.id, o.name FROM wiki_section_organizations wso JOIN organizations o ON o.id = wso.organization_id WHERE wso.section_id = ws.id ORDER BY o.id) o) END) AS organizations
      FROM wiki_sections ws WHERE ws.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const sectionProjectIds = normalizeIntArray(fields.projects !== undefined ? fields.projects : fields.project_ids);
    const sectionOrganizationIds = normalizeIntArray(fields.organizations !== undefined ? fields.organizations : fields.organization_ids);

    const q = `INSERT INTO wiki_sections (name, slug, description, parent_id, order_index, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, slug, description, parent_id, order_index, created_by, updated_by, created_at, updated_at`;
    const vals = [fields.name, fields.slug, fields.description, fields.parent_id, fields.order_index, fields.created_by, fields.updated_by];
    const res = await pool.query(q, vals);
    const created = res.rows[0];

    try {
      if (created && Array.isArray(sectionProjectIds)) {
        if (sectionProjectIds.length > 0) {
          const pVals = [];
          const pPlaceholders = [];
          let pIdx = 1;
          for (const pid of sectionProjectIds) {
            pPlaceholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++})`);
            pVals.push(created.id, pid, fields.created_by || null);
          }
          await pool.query(`INSERT INTO wiki_section_projects (section_id, project_id, created_by) VALUES ${pPlaceholders.join(', ')} ON CONFLICT DO NOTHING`, pVals);
        }
      }
    } catch (e) {}

    try {
      if (created && Array.isArray(sectionOrganizationIds)) {
        if (sectionOrganizationIds.length > 0) {
          const oVals = [];
          const oPlaceholders = [];
          let oIdx = 1;
          for (const oid of sectionOrganizationIds) {
            oPlaceholders.push(`($${oIdx++}, $${oIdx++}, $${oIdx++})`);
            oVals.push(created.id, oid, fields.created_by || null);
          }
          await pool.query(`INSERT INTO wiki_section_organizations (section_id, organization_id, created_by) VALUES ${oPlaceholders.join(', ')} ON CONFLICT DO NOTHING`, oVals);
        }
      }
    } catch (e) {}

    return await WikiSection.findById(created.id);
  }

  static async update(id, fields) {
    const hasProjectArrayInput = Object.prototype.hasOwnProperty.call(fields, 'projects') || Object.prototype.hasOwnProperty.call(fields, 'project_ids');
    const hasProjectSingleInput = Object.prototype.hasOwnProperty.call(fields, 'project_id');
    const hasOrgArrayInput = Object.prototype.hasOwnProperty.call(fields, 'organizations') || Object.prototype.hasOwnProperty.call(fields, 'organization_ids');
    const hasOrgSingleInput = Object.prototype.hasOwnProperty.call(fields, 'organization_id');

    const sectionProjectIds = hasProjectArrayInput
      ? normalizeIntArray(fields.projects !== undefined ? fields.projects : fields.project_ids)
      : (hasProjectSingleInput ? normalizeIntArray(fields.project_id) : undefined);
    const sectionOrganizationIds = hasOrgArrayInput
      ? normalizeIntArray(fields.organizations !== undefined ? fields.organizations : fields.organization_ids)
      : (hasOrgSingleInput ? normalizeIntArray(fields.organization_id) : undefined);

    const parts = [];
    const values = [];
    let idx = 1;

    ['name','slug','description','parent_id','order_index','updated_by'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });

    let updated = null;
    if (parts.length > 0) {
      const q = `UPDATE wiki_sections SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id`;
      values.push(id);
      const res = await pool.query(q, values);
      updated = res.rows[0] || null;
    } else {
      updated = await WikiSection.findById(id);
      if (updated) updated = { id: updated.id };
    }

    if (!updated) return null;

    try {
      if (Array.isArray(sectionProjectIds)) {
        await pool.query(`DELETE FROM wiki_section_projects WHERE section_id = $1`, [id]);
        if (sectionProjectIds.length > 0) {
          const pVals = [];
          const pPlaceholders = [];
          let pIdx = 1;
          for (const pid of sectionProjectIds) {
            pPlaceholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++})`);
            pVals.push(id, pid, fields.updated_by || null);
          }
          await pool.query(`INSERT INTO wiki_section_projects (section_id, project_id, created_by) VALUES ${pPlaceholders.join(', ')} ON CONFLICT DO NOTHING`, pVals);
        }
      }
    } catch (e) {}

    try {
      if (Array.isArray(sectionOrganizationIds)) {
        await pool.query(`DELETE FROM wiki_section_organizations WHERE section_id = $1`, [id]);
        if (sectionOrganizationIds.length > 0) {
          const oVals = [];
          const oPlaceholders = [];
          let oIdx = 1;
          for (const oid of sectionOrganizationIds) {
            oPlaceholders.push(`($${oIdx++}, $${oIdx++}, $${oIdx++})`);
            oVals.push(id, oid, fields.updated_by || null);
          }
          await pool.query(`INSERT INTO wiki_section_organizations (section_id, organization_id, created_by) VALUES ${oPlaceholders.join(', ')} ON CONFLICT DO NOTHING`, oVals);
        }
      }
    } catch (e) {}

    return await WikiSection.findById(id);
  }

  static async softDelete(id) {
    try {
      const q = `DELETE FROM wiki_sections WHERE id = $1`;
      const res = await pool.query(q, [id]);
      return res.rowCount > 0;
    } catch (err) {
      return false;
    }
  }
}

module.exports = WikiSection;
