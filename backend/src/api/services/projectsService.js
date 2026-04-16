const Project = require('../../db/models/Project');
const Role = require('../../db/models/Role');
const UserRole = require('../../db/models/UserRole');
const { hasPermission } = require('./permissionChecker');
const Permission = require('../../db/models/Permission');
const { hasPermissionForProject } = require('./permissionChecker');
const pool = require('../../db/connection');

/**
 * ProjectsService
 *
 * Service layer for project management. Applies permission checks and uses
 * Project and UserProject models for persistence and assignment logic.
 */
class ProjectsService {
  static async listProjects(query = {}, actor) {
    const requiredPermission = 'projects.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.view'); err.statusCode = 403; throw err; }
    // Return all projects to any user with projects.view permission.
    // Previously we limited this to projects assigned to the user unless they had projects.view_all;
    // requirement changed: remove assignment-based filtering.
    const projects = await Project.list(query);
    // attach characteristics and images for each project
    for (const p of projects) {
      try {
        // characteristics (one row per project)
          const cRes = await pool.query(`SELECT vessel_type, loa, beam, draft, displacement, deadweight, net_cargo_capacity, gross_tonnage, speed_max, speed_service, main_engine_power_kw, range_nm, endurance_days, stability, register_class, ice_class, crew_count, description FROM projects_characteristics WHERE project_id = $1 LIMIT 1`, [p.id]);
        p.characteristics = cRes.rows[0] || null;
      } catch (e) {
        p.characteristics = null;
      }
      try {
        const iRes = await pool.query(`SELECT pi.id, pi.storage_id, pi.is_main, pi.sort_order, pi.caption, s.url, s.file_name, s.mime_type FROM projects_images pi JOIN storage s ON s.id = pi.storage_id WHERE pi.project_id = $1 ORDER BY pi.is_main DESC, pi.sort_order ASC, pi.id ASC`, [p.id]);
        p.images = iRes.rows || [];
      } catch (e) {
        p.images = [];
      }
    }
    return projects;
  }

  static async getProjectById(id, actor) {
    const requiredPermission = 'projects.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const p = await Project.findById(Number(id));
    if (!p) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    // Any user with projects.view permission may access project details; remove assignment check.
    // attach characteristics
    try {
        const cRes = await pool.query(`SELECT vessel_type, loa, beam, draft, displacement, deadweight, net_cargo_capacity, gross_tonnage, speed_max, speed_service, main_engine_power_kw, range_nm, endurance_days, stability, register_class, ice_class, crew_count, description FROM projects_characteristics WHERE project_id = $1 LIMIT 1`, [p.id]);
      p.characteristics = cRes.rows[0] || null;
    } catch (e) {
      p.characteristics = null;
    }
    // attach images
    try {
      const iRes = await pool.query(`SELECT pi.id, pi.storage_id, pi.is_main, pi.sort_order, pi.caption, s.url, s.file_name, s.mime_type FROM projects_images pi JOIN storage s ON s.id = pi.storage_id WHERE pi.project_id = $1 ORDER BY pi.is_main DESC, pi.sort_order ASC, pi.id ASC`, [p.id]);
      p.images = iRes.rows || [];
    } catch (e) {
      p.images = [];
    }
    return p;
  }

  static async createProject(fields, actor) {
    const requiredPermission = 'projects.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.create'); err.statusCode = 403; throw err; }
    if (!fields || !fields.name) { const err = new Error('Missing project name'); err.statusCode = 400; throw err; }
    // Set current actor as owner if owner_id not explicitly provided
    const ownerId = (fields.owner_id && Number(fields.owner_id)) ? Number(fields.owner_id) : actor.id;
    const created = await Project.create({ name: fields.name, description: fields.description || null, code: fields.code || null, owner_id: ownerId });

    // Create a project-scoped owner role and assign the actor to it
    try {
      // Create or get a global 'owner' role and assign it scoped to the created project via user_roles
      const ownerRole = await Role.findOrCreate({ name: 'owner', description: 'Project owner' });
      await UserRole.assign(actor.id, ownerRole.id, created.id);
    } catch (e) {
      console.error('Failed to assign owner role to project creator:', e && e.message || e);
    }

    return created;
  }

  // List projects assigned to a specific user (no permission checks here;
  // controller enforces authentication via middleware).
  static async listProjectsForUser(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const projects = await Project.listForUser(actor.id, query);
    // Attach participants for each project: id, full_name, url_avatar (exclude email and phone)
    const pool = require('../../db/connection');
    // Preload available permission codes to compute per-project permissions for the actor
    let allPermissions = [];
    try {
      allPermissions = await Permission.list();
    } catch (e) {
      allPermissions = [];
    }
    for (const p of projects) {
      try {
        const q = `SELECT u.id, u.email, u.phone, u.avatar_id,
          concat_ws(' ', u.last_name, u.first_name, u.middle_name) AS full_name
          FROM users u
          WHERE u.id IN (SELECT user_id FROM user_roles WHERE project_id = $1)
          ORDER BY u.last_name, u.first_name`;
        const res = await pool.query(q, [p.id]);
        p.participants = res.rows.map(r => ({ id: r.id, full_name: r.full_name, avatar_id: r.avatar_id }));
      } catch (e) {
        p.participants = [];
      } 
      // Compute permissions available to the actor for this specific project
      try {
        const perms = [];
        for (const perm of allPermissions) {
          try {
            // hasPermissionForProject handles actor.permissions shortcut and DB checks
            // eslint-disable-next-line no-await-in-loop
            const allowed = await hasPermissionForProject(actor, perm.code, p.id);
            if (allowed) perms.push(perm.code);
          } catch (inner) {
            // ignore individual permission check failures
          }
        }
        p.permissions = perms;
      } catch (e) {
        p.permissions = [];
      }
      // Attach characteristics and images
      try {
          const cRes = await pool.query(`SELECT vessel_type, loa, beam, draft, displacement, deadweight, net_cargo_capacity, gross_tonnage, speed_max, speed_service, main_engine_power_kw, range_nm, endurance_days, stability, register_class, ice_class, crew_count, description FROM projects_characteristics WHERE project_id = $1 LIMIT 1`, [p.id]);
        p.characteristics = cRes.rows[0] || null;
      } catch (e) {
        p.characteristics = null;
      }
      try {
        const iRes = await pool.query(`SELECT pi.id, pi.storage_id, pi.is_main, pi.sort_order, pi.caption, s.url, s.file_name, s.mime_type FROM projects_images pi JOIN storage s ON s.id = pi.storage_id WHERE pi.project_id = $1 ORDER BY pi.is_main DESC, pi.sort_order ASC, pi.id ASC`, [p.id]);
        p.images = iRes.rows || [];
      } catch (e) {
        p.images = [];
      }
    }
    return projects;
  }

  static async updateProject(id, fields, actor) {
    const requiredPermission = 'projects.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Project.update(Number(id), fields);
    if (!updated) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteProject(id, actor) {
    const requiredPermission = 'projects.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await Project.softDelete(Number(id));
    if (!ok) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  /* Characteristics CRUD */
  static async upsertCharacteristics(projectId, fields = {}, actor) {
    const requiredPermission = 'projects.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.update'); err.statusCode = 403; throw err; }
    if (!projectId || Number.isNaN(Number(projectId))) { const err = new Error('Invalid project id'); err.statusCode = 400; throw err; }
    // ensure project exists
    const pRes = await pool.query('SELECT id FROM projects WHERE id = $1 LIMIT 1', [Number(projectId)]);
    if (pRes.rows.length === 0) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }

    const cols = ['vessel_type','loa','beam','draft','displacement','deadweight','net_cargo_capacity','gross_tonnage','speed_max','speed_service','main_engine_power_kw','range_nm','endurance_days','stability','register_class','ice_class','crew_count','description'];
    const setParts = [];
    const values = [];
    let idx = 1;
    for (const k of cols) {
      if (fields[k] !== undefined) { setParts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    }
    // try update if exists
    const existsRes = await pool.query('SELECT id FROM projects_characteristics WHERE project_id = $1 LIMIT 1', [Number(projectId)]);
    if (existsRes.rows.length > 0) {
      if (setParts.length === 0) {
        const r = await pool.query('SELECT * FROM projects_characteristics WHERE project_id = $1 LIMIT 1', [Number(projectId)]);
        return r.rows[0] || null;
      }
      const q = `UPDATE projects_characteristics SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE project_id = $${idx} RETURNING *`;
      values.push(Number(projectId));
      const upd = await pool.query(q, values);
      return upd.rows[0] || null;
    }
    // insert
    const insertCols = ['project_id'].concat(cols.filter(k => fields[k] !== undefined));
    const insertVals = [Number(projectId)].concat(cols.filter(k => fields[k] !== undefined).map(k => fields[k]));
    const placeholders = insertVals.map((_, i) => `$${i+1}`).join(', ');
    const q = `INSERT INTO projects_characteristics (${insertCols.join(',')}) VALUES (${placeholders}) RETURNING *`;
    const res = await pool.query(q, insertVals);
    return res.rows[0] || null;
  }

  static async deleteCharacteristics(projectId, actor) {
    const requiredPermission = 'projects.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.update'); err.statusCode = 403; throw err; }
    if (!projectId || Number.isNaN(Number(projectId))) { const err = new Error('Invalid project id'); err.statusCode = 400; throw err; }
    const res = await pool.query('DELETE FROM projects_characteristics WHERE project_id = $1', [Number(projectId)]);
    return { deleted: res.rowCount };
  }

  /* Images CRUD */
  static async addProjectImage(projectId, payload = {}, actor) {
    const requiredPermission = 'projects.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.update'); err.statusCode = 403; throw err; }
    if (!projectId || Number.isNaN(Number(projectId))) { const err = new Error('Invalid project id'); err.statusCode = 400; throw err; }
    const { storage_id, is_main = false, caption = null, sort_order = 0 } = payload;
    if (!storage_id) { const err = new Error('Missing storage_id'); err.statusCode = 400; throw err; }
    // ensure project exists
    const pRes = await pool.query('SELECT id FROM projects WHERE id = $1 LIMIT 1', [Number(projectId)]);
    if (pRes.rows.length === 0) { const err = new Error('Project not found'); err.statusCode = 404; throw err; }
    // ensure storage exists
    const sRes = await pool.query('SELECT id FROM storage WHERE id = $1 LIMIT 1', [Number(storage_id)]);
    if (sRes.rows.length === 0) { const err = new Error('Storage record not found'); err.statusCode = 404; throw err; }
    // if is_main, clear other mains
    if (is_main) {
      await pool.query('UPDATE projects_images SET is_main = false WHERE project_id = $1', [Number(projectId)]);
    }
    const q = `INSERT INTO projects_images (project_id, storage_id, is_main, sort_order, caption) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const res = await pool.query(q, [Number(projectId), Number(storage_id), is_main, sort_order, caption]);
    // attach storage url
    const row = res.rows[0];
    const iRes = await pool.query('SELECT s.url, s.file_name, s.mime_type FROM storage s WHERE s.id = $1 LIMIT 1', [row.storage_id]);
    row.url = iRes.rows[0] ? iRes.rows[0].url : null;
    return row;
  }

  static async updateProjectImage(id, fields = {}, actor) {
    const requiredPermission = 'projects.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid image id'); err.statusCode = 400; throw err; }
    const curRes = await pool.query('SELECT * FROM projects_images WHERE id = $1 LIMIT 1', [Number(id)]);
    if (curRes.rows.length === 0) { const err = new Error('Image not found'); err.statusCode = 404; throw err; }
    const cur = curRes.rows[0];
    const cols = ['storage_id','is_main','sort_order','caption'];
    const parts = [];
    const values = [];
    let idx = 1;
    for (const k of cols) {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    }
    if (parts.length === 0) {
      // return existing with storage info
      const sRes = await pool.query('SELECT s.url, s.file_name, s.mime_type FROM storage s WHERE s.id = $1 LIMIT 1', [cur.storage_id]);
      cur.url = sRes.rows[0] ? sRes.rows[0].url : null;
      return cur;
    }
    // if is_main being set true, clear others
    if (fields.is_main === true) {
      await pool.query('UPDATE projects_images SET is_main = false WHERE project_id = $1', [cur.project_id]);
    }
    const q = `UPDATE projects_images SET ${parts.join(', ')}, created_at = created_at WHERE id = $${idx} RETURNING *`;
    values.push(Number(id));
    const res = await pool.query(q, values);
    const row = res.rows[0];
    const sRes = await pool.query('SELECT s.url, s.file_name, s.mime_type FROM storage s WHERE s.id = $1 LIMIT 1', [row.storage_id]);
    row.url = sRes.rows[0] ? sRes.rows[0].url : null;
    return row;
  }

  static async deleteProjectImage(id, actor) {
    const requiredPermission = 'projects.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission projects.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid image id'); err.statusCode = 400; throw err; }
    const res = await pool.query('DELETE FROM projects_images WHERE id = $1', [Number(id)]);
    return { deleted: res.rowCount };
  }
}

module.exports = ProjectsService;
