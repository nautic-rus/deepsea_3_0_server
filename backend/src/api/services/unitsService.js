const Unit = require('../../db/models/Unit');

class UnitsService {
  static async list(req) {
    const { page, limit, search } = req.query || {};
    const pg = parseInt(page, 10) || 1;
    const lim = limit ? parseInt(limit, 10) : undefined;
    return await Unit.list({ page: pg, limit: lim, search });
  }

  static async getById(req) {
    const id = req.params.id;
    return await Unit.findById(id);
  }

  static async create(req) {
    const fields = req.body || {};
    return await Unit.create(fields);
  }

  static async update(req) {
    const id = req.params.id;
    const fields = req.body || {};
    return await Unit.update(id, fields);
  }

  static async remove(req) {
    const id = req.params.id;
    return await Unit.softDelete(id);
  }
}

module.exports = UnitsService;
