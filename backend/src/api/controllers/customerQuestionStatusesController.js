const CustomerQuestionStatusesService = require('../services/customerQuestionStatusesService');

exports.list = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const rows = await CustomerQuestionStatusesService.list(actor);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    const row = await CustomerQuestionStatusesService.getById(id, actor);
    res.json(row);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const created = await CustomerQuestionStatusesService.create(req.body || {}, actor);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    const updated = await CustomerQuestionStatusesService.update(id, req.body || {}, actor);
    res.json({ data: updated });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user || null;
    const id = parseInt(req.params.id, 10);
    await CustomerQuestionStatusesService.delete(id, actor);
    res.json({ message: 'Customer question status deleted' });
  } catch (err) { next(err); }
};
