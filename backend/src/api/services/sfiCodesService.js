const SfiCode = require('../../db/models/SfiCode');

class SfiCodesService {
  static async list(req) {
    const { page, limit, search, parent_id } = req.query || {};
    const pg = parseInt(page, 10) || 1;
    const lim = limit ? parseInt(limit, 10) : undefined;
    return await SfiCode.list({ page: pg, limit: lim, search, parent_id });
  }

  static async getById(req) {
    const id = req.params.id;
    return await SfiCode.findById(id);
  }

  static async create(req) {
    const fields = req.body || {};
    if (!fields.code || !String(fields.code).trim()) {
      const err = new Error('Missing required field: code');
      err.statusCode = 400;
      throw err;
    }
    if (!fields.name || !String(fields.name).trim()) {
      const err = new Error('Missing required field: name');
      err.statusCode = 400;
      throw err;
    }
    fields.code = String(fields.code).trim();
    fields.name = String(fields.name).trim();
    if (fields.description !== undefined && fields.description !== null) fields.description = String(fields.description);
    if (fields.name_ru !== undefined && fields.name_ru !== null) fields.name_ru = String(fields.name_ru).trim();
    if (fields.name_en !== undefined && fields.name_en !== null) fields.name_en = String(fields.name_en).trim();
    if (fields.description_ru !== undefined && fields.description_ru !== null) fields.description_ru = String(fields.description_ru);
    if (fields.description_en !== undefined && fields.description_en !== null) fields.description_en = String(fields.description_en);
    return await SfiCode.create(fields);
  }

  static async update(req) {
    const id = req.params.id;
    const fields = req.body || {};
    if (fields.code !== undefined) {
      fields.code = String(fields.code).trim();
      if (!fields.code) {
        const err = new Error('Missing required field: code');
        err.statusCode = 400;
        throw err;
      }
    }
    if (fields.name !== undefined) {
      fields.name = String(fields.name).trim();
      if (!fields.name) {
        const err = new Error('Missing required field: name');
        err.statusCode = 400;
        throw err;
      }
    }
    if (fields.description !== undefined && fields.description !== null) fields.description = String(fields.description);
    if (fields.name_ru !== undefined && fields.name_ru !== null) fields.name_ru = String(fields.name_ru).trim();
    if (fields.name_en !== undefined && fields.name_en !== null) fields.name_en = String(fields.name_en).trim();
    if (fields.description_ru !== undefined && fields.description_ru !== null) fields.description_ru = String(fields.description_ru);
    if (fields.description_en !== undefined && fields.description_en !== null) fields.description_en = String(fields.description_en);
    const row = await SfiCode.update(id, fields);
    return row;
  }

  static async remove(req) {
    const id = req.params.id;
    if (!id || Number.isNaN(Number(id))) {
      const err = new Error('Invalid id');
      err.statusCode = 400;
      throw err;
    }
    return await SfiCode.delete(Number(id));
  }
}

module.exports = SfiCodesService;
