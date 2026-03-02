const PagePermissionsService = require('../services/pagePermissionsService');

exports.list = async (req, res, next) => {
  try {
    const actor = req.user;
    const rows = await PagePermissionsService.list(req.query || {}, actor);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user;
    const created = await PagePermissionsService.create(req.body || {}, actor);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = parseInt(req.params.id, 10);
    await PagePermissionsService.delete(id, actor);
    res.json({ message: 'Page permission deleted' });
  } catch (err) { next(err); }
};
