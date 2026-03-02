const PagesService = require('../services/pagesService');

exports.list = async (req, res, next) => {
  try {
    const actor = req.user;
    const rows = await PagesService.listPages(actor);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user;
    const created = await PagesService.createPage(req.body || {}, actor);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = parseInt(req.params.id, 10);
    const updated = await PagesService.updatePage(id, req.body || {}, actor);
    res.json({ data: updated });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = parseInt(req.params.id, 10);
    await PagesService.deletePage(id, actor);
    res.json({ message: 'Page deleted' });
  } catch (err) { next(err); }
};
