const StatementsVersion = require('../../db/models/StatementsVersion');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

class StatementsVersionService {
  static _toUserObject(row) {
    if (!row) return null;
    const fullName = [row.last_name, row.first_name, row.middle_name]
      .filter(Boolean)
      .map((part) => String(part).trim())
      .join(' ')
      .trim() || null;
    return {
      id: row.id,
      full_name: fullName,
      avatar_id: row.avatar_id || null
    };
  }

  static async _enrichRows(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;

    const userIds = [...new Set(
      rows
        .flatMap((row) => [row.created_by, row.updated_by])
        .filter((id) => id !== null && id !== undefined)
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id) && id > 0)
    )];

    if (userIds.length === 0) {
      return rows.map((row) => Object.assign({}, row, {
        created_by: null,
        updated_by: null
      }));
    }

    const res = await pool.query(
      `SELECT id, first_name, last_name, middle_name, avatar_id
       FROM users
       WHERE id = ANY($1::int[])`,
      [userIds]
    );
    const usersMap = new Map((res.rows || []).map((row) => [row.id, StatementsVersionService._toUserObject(row)]));

    return rows.map((row) => Object.assign({}, row, {
      created_by: row.created_by ? usersMap.get(Number(row.created_by)) || null : null,
      updated_by: row.updated_by ? usersMap.get(Number(row.updated_by)) || null : null
    }));
  }

  static async list(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const rows = await StatementsVersion.list(query);
    return await StatementsVersionService._enrichRows(rows);
  }

  static async getById(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const r = await StatementsVersion.findById(id);
    if (!r) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    const [enriched] = await StatementsVersionService._enrichRows([r]);
    return enriched;
  }

  static async create(fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    if (!fields.statement_id || !fields.version) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    fields.created_by = actor.id;
    fields.updated_by = actor.id;
    return await StatementsVersion.create(fields);
  }

  static async update(id, fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    fields.updated_by = actor.id;
    const updated = await StatementsVersion.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async delete(id, actor) {
    const allowed = await hasPermission(actor, 'statements.delete');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const ok = await StatementsVersion.softDelete(id);
    if (!ok) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }
}

module.exports = StatementsVersionService;
