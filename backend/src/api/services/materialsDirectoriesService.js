const MaterialsDirectory = require('../../db/models/MaterialsDirectory');
const pool = require('../../db/connection');

// slugify: create URL-friendly segment from a directory name
const slugify = (s) => {
  if (!s) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[\/\\]+/g, '-').replace(/[^a-z0-9\u0400-\u04FF\-]/gi, '');
};

class MaterialsDirectoriesService {
  static async list(req) {
    const { page, limit, search } = req.query || {};
    const pg = parseInt(page, 10) || 1;
    const lim = limit ? parseInt(limit, 10) : undefined;
    return await MaterialsDirectory.list({ page: pg, limit: lim, search });
  }

  static async getById(req) {
    const id = req.params.id;
    return await MaterialsDirectory.findById(id);
  }

  static async create(req) {
    const fields = req.body || {};
    fields.created_by = req.user && req.user.id;

    if (!fields.name || typeof fields.name !== 'string' || !fields.name.trim()) {
      const err = new Error('Missing required field: name');
      err.statusCode = 400;
      throw err;
    }

    const segment = slugify(fields.name);

    if (fields.parent_id) {
      const parent = await MaterialsDirectory.findById(fields.parent_id);
      if (!parent) {
        const err = new Error('Parent directory not found');
        err.statusCode = 400;
        throw err;
      }
      const parentPath = parent.path ? parent.path.replace(/\/$/, '') : '';
      fields.path = parentPath ? `${parentPath}/${segment}` : `/${segment}`;
    } else {
      fields.path = `/${segment}`;
    }

    // compute path automatically based on parent hierarchy (redundant parent lookup is acceptable)
    if (fields.parent_id) {
      const parent = await MaterialsDirectory.findById(fields.parent_id);
      const parentPath = parent && parent.path ? parent.path : '';
      const nameSeg = slugify(fields.name || '');
      // ensure parentPath doesn't end with slash
      const cleanParent = parentPath.replace(/\/+$/,'');
      fields.path = cleanParent ? `${cleanParent}/${nameSeg}` : `/${nameSeg}`;
    } else {
      const nameSeg = slugify(fields.name || '');
      fields.path = `/${nameSeg}`;
    }

      // remove client-supplied path if any — server computes it
      // (fields.path already set)
      return await MaterialsDirectory.create(fields);
  }

  static async update(req) {
    const id = req.params.id;
    const fields = req.body || {};
    fields.updated_by = req.user && req.user.id;
    // if name or parent_id changed, recompute path and update descendants
    const needRecalc = (fields.name !== undefined) || (fields.parent_id !== undefined);
    if (needRecalc) {
      const current = await MaterialsDirectory.findById(id);
      if (!current) {
        const err = new Error('Not found'); err.statusCode = 404; throw err;
      }
      // reuse module-level slugify
      let newParentPath = '';
      if (fields.parent_id) {
        if (Number(fields.parent_id) === Number(id)) {
          const err = new Error('parent_id cannot be the same as the directory id'); err.statusCode = 400; throw err;
        }
        const parent = await MaterialsDirectory.findById(fields.parent_id);
        if (!parent) { const err = new Error('Parent directory not found'); err.statusCode = 400; throw err; }
        newParentPath = parent.path || '';
      } else if (current.parent_id) {
        // keep existing parent path if parent_id not changed and current has parent
        newParentPath = (current.path || '').replace(/\/$/, '').split('/').slice(0, -1).join('/');
      }

      const nameSeg = slugify(fields.name !== undefined ? fields.name : current.name);
      const cleanParent = (newParentPath || '').replace(/\/+$/,'');
      const newPath = cleanParent ? `${cleanParent}/${nameSeg}` : `/${nameSeg}`;
      fields.path = newPath;

      // perform update
      const updated = await MaterialsDirectory.update(id, fields);

      // if path changed, update descendant paths
      const oldPath = current.path || '';
      if (oldPath && oldPath !== newPath) {
        const oldLen = oldPath.length + 1; // position to start substring (1-based)
        // Update paths of descendants that start with oldPath + '/'
        const q = `UPDATE equipment_materials_directories SET path = $1 || substring(path FROM $2) WHERE path LIKE $3`;
        const likePattern = oldPath.replace(/%/g,'\\%').replace(/_/g,'\\_') + '/%';
        await pool.query(q, [newPath, oldLen, likePattern]);
      }

      return updated;
    }

    return await MaterialsDirectory.update(id, fields);
  }

  static async remove(req) {
    const id = req.params.id;
    return await MaterialsDirectory.softDelete(id);
  }
}

module.exports = MaterialsDirectoriesService;
