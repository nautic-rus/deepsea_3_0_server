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
    res.json(row);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const IssueWorkFlow = require('../../db/models/IssueWorkFlow');
    const created = await IssueWorkFlow.create(req.body || {});
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    const IssueWorkFlow = require('../../db/models/IssueWorkFlow');
    const updated = await IssueWorkFlow.update(Number(id), req.body || {});
    res.json({ data: updated });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    const IssueWorkFlow = require('../../db/models/IssueWorkFlow');
    await IssueWorkFlow.delete(Number(id));
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
