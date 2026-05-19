const StatementsPart = require('../../db/models/StatementsPart');
const StatementsVersion = require('../../db/models/StatementsVersion');
const pool = require('../../db/connection');
const { hasPermission } = require('./permissionChecker');

class StatementsPartsService {
  static async list(query = {}, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    return await StatementsPart.list(query);
  }

  static async getById(id, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.view');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const r = await StatementsPart.findById(id);
    if (!r) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return r;
  }

  static async create(fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    if (!fields.statements_version_id) { const err = new Error('Missing fields'); err.statusCode = 400; throw err; }
    fields.created_by = actor.id;
    return await StatementsPart.create(fields);
  }

  static async update(id, fields, actor) {
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const updated = await StatementsPart.update(id, fields);
    if (!updated) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async delete(id, actor) {
    const allowed = await hasPermission(actor, 'statements.delete');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }
    const ok = await StatementsPart.softDelete(id);
    if (!ok) { const err = new Error('Not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  static async applyFromStatementsVersion(statementsVersionId, actor) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'statements.update');
    if (!allowed) { const err = new Error('Forbidden'); err.statusCode = 403; throw err; }

    const versionId = Number(statementsVersionId);
    if (!versionId || Number.isNaN(versionId)) {
      const err = new Error('Invalid statements_version_id');
      err.statusCode = 400;
      throw err;
    }

    const version = await StatementsVersion.findById(versionId);
    if (!version) {
      const err = new Error('Statements version not found');
      err.statusCode = 404;
      throw err;
    }
    const statementId = Number(version.statement_id);
    if (!statementId || Number.isNaN(statementId)) {
      const err = new Error('Statements version is not linked to a statement');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM statements_parts WHERE statements_version_id = $1', [versionId]);

      const candidateQuery = `
        WITH latest_spec_versions AS (
          SELECT DISTINCT ON (emp.equipment_material_id)
            emp.equipment_material_id,
            sv.id AS specification_version_id
          FROM equipment_materials_projects emp
          JOIN specification_parts sp ON sp.material_id = emp.equipment_material_id
          JOIN specification_version sv ON sv.id = sp.specification_version_id
          WHERE emp.statement_id = $1
          ORDER BY emp.equipment_material_id, sv.created_at DESC NULLS LAST, sv.id DESC
        )
        SELECT
          l.equipment_material_id,
          MIN(sp.id) AS specification_part_id,
          SUM(COALESCE(sp.quantity, 1))::numeric AS quantity
        FROM latest_spec_versions l
        JOIN specification_parts sp
          ON sp.material_id = l.equipment_material_id
         AND sp.specification_version_id = l.specification_version_id
        GROUP BY l.equipment_material_id
        ORDER BY l.equipment_material_id
      `;

      const candidateRes = await client.query(candidateQuery, [statementId]);
      const insertedIds = [];

      for (const row of candidateRes.rows || []) {
        const insertRes = await client.query(
          `INSERT INTO statements_parts (statements_version_id, specification_part_id, quantity, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [versionId, row.specification_part_id, row.quantity, actor.id]
        );
        if (insertRes.rows[0] && insertRes.rows[0].id) {
          insertedIds.push(insertRes.rows[0].id);
        }
      }

      await client.query(
        `UPDATE statements_version
            SET updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [versionId, actor.id]
      );

      await client.query('COMMIT');

      const rows = await Promise.all(insertedIds.map((id) => StatementsPart.findById(id)));
      return {
        statements_version_id: versionId,
        inserted_count: insertedIds.length,
        data: rows.filter(Boolean)
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = StatementsPartsService;
