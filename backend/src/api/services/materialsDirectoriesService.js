const MaterialsDirectory = require('../../db/models/MaterialsDirectory');

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
    return await MaterialsDirectory.create(fields);
  }

  static async update(req) {
    const id = req.params.id;
    const fields = req.body || {};
    fields.updated_by = req.user && req.user.id;
    return await MaterialsDirectory.update(id, fields);
  }

  static async remove(req) {
    const id = req.params.id;
    return await MaterialsDirectory.softDelete(id);
  }
}

module.exports = MaterialsDirectoriesService;
