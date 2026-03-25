const JobTitle = require('../../db/models/JobTitle');
const { hasPermission } = require('./permissionChecker');

class JobTitlesService {
  static async listJobTitles(actor) {
    const requiredPermission = 'job_titles.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission job_titles.view'); err.statusCode = 403; throw err; }
    return JobTitle.list();
  }

  static async createJobTitle(name, actor) {
    const requiredPermission = 'job_titles.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission job_titles.create'); err.statusCode = 403; throw err; }
    if (!name || !String(name).trim()) { const err = new Error('Name required'); err.statusCode = 400; throw err; }
    return JobTitle.create(String(name).trim());
  }

  static async updateJobTitle(id, fields, actor) {
    const requiredPermission = 'job_titles.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission job_titles.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    if (fields.name !== undefined && (!fields.name || typeof fields.name !== 'string')) { const err = new Error('Invalid name'); err.statusCode = 400; throw err; }
    if (fields.description !== undefined && fields.description !== null && typeof fields.description !== 'string') { const err = new Error('Invalid description'); err.statusCode = 400; throw err; }
    const updated = await JobTitle.update(Number(id), fields);
    if (!updated) { const err = new Error('Job title not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteJobTitle(id, actor) {
    const requiredPermission = 'job_titles.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission job_titles.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const ok = await JobTitle.softDelete(Number(id));
    if (!ok) { const err = new Error('Job title not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = JobTitlesService;
