const OrganizationsService = require('../services/organizationsService');

exports.list = async (req, res, next) => {
  try {
    const actor = req.user;
    const rows = await OrganizationsService.listOrganizations(actor);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const actor = req.user;
    const { name, slug, description } = req.body || {};
    const created = await OrganizationsService.createOrganization(name, slug, description, actor);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = Number(req.params.id);
    const fields = req.body || {};
    const updated = await OrganizationsService.updateOrganization(id, fields, actor);
    res.status(200).json({ data: updated });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const actor = req.user;
    const id = Number(req.params.id);
    await OrganizationsService.deleteOrganization(id, actor);
    res.status(200).json({ message: 'Organization deleted' });
  } catch (err) { next(err); }
};
