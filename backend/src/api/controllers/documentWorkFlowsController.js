const DocumentWorkFlowsService = require('../services/documentWorkFlowsService');

exports.list = async (req, res, next) => {
  try {
    const actor = req.user;
    const opts = { project_id: req.query.project_id ? Number(req.query.project_id) : undefined, document_type_id: req.query.document_type_id ? Number(req.query.document_type_id) : undefined };
    const rows = await DocumentWorkFlowsService.list(actor, opts);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = parseInt(req.params.id, 10);
    const row = await DocumentWorkFlowsService.get(id, actor);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user;
    const created = await DocumentWorkFlowsService.create(req.body || {}, actor);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = parseInt(req.params.id, 10);
    const updated = await DocumentWorkFlowsService.update(id, req.body || {}, actor);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = parseInt(req.params.id, 10);
    await DocumentWorkFlowsService.delete(id, actor);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
