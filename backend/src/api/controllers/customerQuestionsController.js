const CustomerQuestionsService = require('../services/customerQuestionsService');

class CustomerQuestionsController {
  static async list(req, res, next) {
    try {
      const actor = req.user || null;
      const query = Object.assign({}, req.query || {});
      // document_id and project_id filters removed; service will ignore them
      delete query.document_id;
      delete query.project_id;
      const rows = await CustomerQuestionsService.listCustomerQuestions(query, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async get(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const row = await CustomerQuestionsService.getCustomerQuestionById(id, actor);
      res.json(row);
    } catch (err) { next(err); }
  }

  static async create(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await CustomerQuestionsService.createCustomerQuestion(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async update(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await CustomerQuestionsService.updateCustomerQuestion(id, req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      await CustomerQuestionsService.deleteCustomerQuestion(id, actor);
      res.json({ message: 'Customer question deleted' });
    } catch (err) { next(err); }
  }

  // File endpoints
  static async attachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (req.file) {
        const StorageService = require('../services/storageService');
        const createdStorage = await StorageService.uploadAndCreate(req.file, actor, req.body || {});
        const created = await CustomerQuestionsService.attachFileToQuestion(Number(id), Number(createdStorage.id), actor);
        res.status(201).json({ data: created });
        return;
      }
      const { storage_id } = req.body || {};
      const created = await CustomerQuestionsService.attachFileToQuestion(Number(id), Number(storage_id), actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async attachLocalFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      if (!req.file) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
      const StorageService = require('../services/storageService');
      const createdStorage = await StorageService.uploadToLocalAndCreate(req.file, actor, req.body || {});
      const created = await CustomerQuestionsService.attachFileToQuestion(Number(id), Number(createdStorage.id), actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async detachFile(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const storageId = parseInt(req.params.storage_id, 10);
      await CustomerQuestionsService.detachFileFromQuestion(Number(id), Number(storageId), actor);
      res.json({ message: 'File detached' });
    } catch (err) { next(err); }
  }

  static async listFiles(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const { limit = 100, offset = 0 } = req.query || {};
      const rows = await CustomerQuestionsService.listQuestionFiles(Number(id), { limit: Number(limit), offset: Number(offset) }, actor);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  // Types CRUD (customer_question_type)
  static async listTypes(req, res, next) {
    try {
      const actor = req.user || null;
      const projectId = req.query && req.query.project_id ? Number(req.query.project_id) : undefined;
      const rows = await CustomerQuestionsService.listTypes(actor, projectId);
      res.json({ data: rows });
    } catch (err) { next(err); }
  }

  static async getType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const projectId = req.query && req.query.project_id ? Number(req.query.project_id) : undefined;
      const rows = await CustomerQuestionsService.listTypes(actor, projectId);
      const row = (rows || []).find(r => Number(r.id) === Number(id));
      if (!row) { const err = new Error('Type not found'); err.statusCode = 404; throw err; }
      res.json(row);
    } catch (err) { next(err); }
  }

  static async createType(req, res, next) {
    try {
      const actor = req.user || null;
      const created = await CustomerQuestionsService.createType(req.body || {}, actor);
      res.status(201).json({ data: created });
    } catch (err) { next(err); }
  }

  static async updateType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const updated = await CustomerQuestionsService.updateType(Number(id), req.body || {}, actor);
      res.json({ data: updated });
    } catch (err) { next(err); }
  }

  static async deleteType(req, res, next) {
    try {
      const actor = req.user || null;
      const id = parseInt(req.params.id, 10);
      const ok = await CustomerQuestionsService.deleteType(Number(id), actor);
      if (!ok) { const err = new Error('Type not found'); err.statusCode = 404; throw err; }
      res.json({ message: 'Type deleted' });
    } catch (err) { next(err); }
  }
}

module.exports = CustomerQuestionsController;
