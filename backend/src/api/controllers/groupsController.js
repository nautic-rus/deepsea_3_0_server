const GroupsService = require('../services/groupsService');

exports.list = async (req, res, next) => {
  try {
    const actor = req.user;
    const rows = await GroupsService.listGroups(actor);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user;
    const { name, description } = req.body || {};
    const created = await GroupsService.createGroup(name, description, actor);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = Number(req.params.id);
    const fields = req.body || {};
    const updated = await GroupsService.updateGroup(id, fields, actor);
    res.status(200).json({ data: updated });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = Number(req.params.id);
    await GroupsService.deleteGroup(id, actor);
    res.status(200).json({ message: 'Group deleted' });
  } catch (err) { next(err); }
};
