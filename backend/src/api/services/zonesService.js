const Zone = require('../../db/models/Zone');
const Project = require('../../db/models/Project');

class ZonesService {
  static async list(req) {
    const { page, limit, search, project_id } = req.query || {};
    const pg = parseInt(page, 10) || 1;
    const lim = limit ? parseInt(limit, 10) : undefined;
    return await Zone.list({
      page: pg,
      limit: lim,
      search,
      project_id,
    });
  }

  static async getById(req) {
    const id = req.params.id;
    return await Zone.findById(id);
  }

  static async create(req) {
    const fields = req.body || {};

    if (!fields.project_id) {
      const err = new Error('Missing required field: project_id');
      err.statusCode = 400;
      throw err;
    }
    if (!fields.name || typeof fields.name !== 'string' || !fields.name.trim()) {
      const err = new Error('Missing required field: name');
      err.statusCode = 400;
      throw err;
    }
    if (fields.code !== undefined && fields.code !== null && fields.code !== '' && typeof fields.code !== 'string') {
      const err = new Error('Invalid field: code');
      err.statusCode = 400;
      throw err;
    }

    const requiredBBoxFields = [
      'bbox_min_x',
      'bbox_min_y',
      'bbox_min_z',
      'bbox_max_x',
      'bbox_max_y',
      'bbox_max_z',
    ];
    for (const key of requiredBBoxFields) {
      if (fields[key] === undefined || fields[key] === null || fields[key] === '') {
        const err = new Error(`Missing required field: ${key}`);
        err.statusCode = 400;
        throw err;
      }
    }

    const project = await Project.findById(fields.project_id);
    if (!project) {
      const err = new Error('Project not found');
      err.statusCode = 400;
      throw err;
    }

    fields.project_id = Number(fields.project_id);
    return await Zone.create(fields);
  }

  static async update(req) {
    const id = req.params.id;
    const fields = req.body || {};

    if (fields.project_id !== undefined && fields.project_id !== null && fields.project_id !== '') {
      const project = await Project.findById(fields.project_id);
      if (!project) {
        const err = new Error('Project not found');
        err.statusCode = 400;
        throw err;
      }
      fields.project_id = Number(fields.project_id);
    }
    if (fields.code !== undefined && fields.code !== null && fields.code !== '' && typeof fields.code !== 'string') {
      const err = new Error('Invalid field: code');
      err.statusCode = 400;
      throw err;
    }

    return await Zone.update(id, fields);
  }

  static async remove(req) {
    const id = req.params.id;
    return await Zone.softDelete(id);
  }
}

module.exports = ZonesService;
