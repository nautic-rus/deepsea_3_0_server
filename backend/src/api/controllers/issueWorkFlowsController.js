const IssueWorkFlowsService = require('../services/issueWorkFlowsService');

exports.list = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const query = req.query || {};
    const rows = await IssueWorkFlowsService.list(query, actor);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    const row = await IssueWorkFlowsService.getById(id, actor);
    res.json({ data: row });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const created = await IssueWorkFlowsService.create(req.body || {}, actor);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    const updated = await IssueWorkFlowsService.update(id, req.body || {}, actor);
    res.json({ data: updated });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    await IssueWorkFlowsService.delete(id, actor);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
