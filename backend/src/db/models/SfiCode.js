const pool = require('../connection');

class SfiCode {
  static _formatRow(r) {
    if (!r) return null;
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      parent_id: r.parent_id,
      parent: r.parent_id ? {
        id: r.parent_id,
        code: r.parent_code || null,
        name: r.parent_name || null,
      } : null,
      level: r.level,
      order_index: r.order_index,
      name_ru: r.name_ru,
      name_en: r.name_en,
      description_ru: r.description_ru,
      description_en: r.description_en,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  static async list({ page = 1, limit, search, parent_id } = {}) {
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;

    if (search) {
      where.push(`(sc.code ILIKE $${idx} OR sc.name ILIKE $${idx} OR sc.name_ru ILIKE $${idx} OR sc.name_en ILIKE $${idx} OR sc.description ILIKE $${idx} OR sc.description_ru ILIKE $${idx} OR sc.description_en ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
      where.push(`sc.parent_id = $${idx++}`);
      values.push(parent_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    let q = `
      SELECT
        sc.id,
        sc.code,
        sc.name,
        sc.description,
        sc.parent_id,
        sc.level,
        sc.order_index,
        sc.name_ru,
        sc.name_en,
        sc.description_ru,
        sc.description_en,
        sc.created_at,
        sc.updated_at,
        p.code AS parent_code,
        p.name AS parent_name
      FROM sfi_codes sc
      LEFT JOIN sfi_codes p ON p.id = sc.parent_id
      ${whereSql}
      ORDER BY sc.level ASC, sc.order_index ASC, sc.code ASC, sc.id ASC
    `;

    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }

    const res = await pool.query(q, values);
    return (res.rows || []).map((row) => SfiCode._formatRow(row));
  }

  static async findById(id) {
    const q = `
      SELECT
        sc.id,
        sc.code,
        sc.name,
        sc.description,
        sc.parent_id,
        sc.level,
        sc.order_index,
        sc.name_ru,
        sc.name_en,
        sc.description_ru,
        sc.description_en,
        sc.created_at,
        sc.updated_at,
        p.code AS parent_code,
        p.name AS parent_name
      FROM sfi_codes sc
      LEFT JOIN sfi_codes p ON p.id = sc.parent_id
      WHERE sc.id = $1
      LIMIT 1
    `;
    const res = await pool.query(q, [id]);
    return SfiCode._formatRow(res.rows[0] || null);
  }

  static async _resolveLevel(parentId, client = pool) {
    if (parentId === null || parentId === undefined || parentId === '') return 1;
    const res = await client.query('SELECT level FROM sfi_codes WHERE id = $1 LIMIT 1', [parentId]);
    const parent = res.rows[0];
    if (!parent) {
      const err = new Error('Parent SFI code not found');
      err.statusCode = 400;
      throw err;
    }
    return (Number(parent.level) || 0) + 1;
  }

  static async _assertNoCycle(id, parentId, client = pool) {
    if (parentId === null || parentId === undefined || parentId === '') return;
    const targetId = Number(id);
    let currentId = Number(parentId);
    const visited = new Set();

    while (currentId && !Number.isNaN(currentId)) {
      if (currentId === targetId) {
        const err = new Error('Circular parent reference is not allowed');
        err.statusCode = 400;
        throw err;
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const res = await client.query('SELECT parent_id FROM sfi_codes WHERE id = $1 LIMIT 1', [currentId]);
      const row = res.rows[0];
      if (!row) break;
      currentId = row.parent_id;
    }
  }

  static async create(fields) {
    const parentId = fields.parent_id === '' ? null : (fields.parent_id ?? null);
    const level = await SfiCode._resolveLevel(parentId);
    const q = `
      INSERT INTO sfi_codes
        (code, name, description, parent_id, level, order_index, name_ru, name_en, description_ru, description_en)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `;
    const vals = [
      fields.code,
      fields.name,
      fields.description || null,
      parentId,
      level,
      fields.order_index ?? 0,
      fields.name_ru || null,
      fields.name_en || null,
      fields.description_ru || null,
      fields.description_en || null,
    ];
    const res = await pool.query(q, vals);
    const inserted = res.rows[0];
    if (!inserted) return null;
    return await SfiCode.findById(inserted.id);
  }

  static async update(id, fields) {
    const current = await SfiCode.findById(id);
    if (!current) return null;

    const hasParentId = Object.prototype.hasOwnProperty.call(fields, 'parent_id');
    const parentId = hasParentId ? (fields.parent_id === '' ? null : fields.parent_id) : current.parent_id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (hasParentId) {
        if (parentId !== null && Number(parentId) === Number(id)) {
          const err = new Error('parent_id cannot reference the row itself');
          err.statusCode = 400;
          throw err;
        }
        await SfiCode._assertNoCycle(id, parentId, client);
      }

      const newLevel = hasParentId ? await SfiCode._resolveLevel(parentId, client) : current.level;
      const parts = [];
      const values = [];
      let idx = 1;

      ['code', 'name', 'description', 'order_index', 'name_ru', 'name_en', 'description_ru', 'description_en'].forEach((k) => {
        if (fields[k] !== undefined) {
          parts.push(`${k} = $${idx++}`);
          values.push(fields[k]);
        }
      });

      if (hasParentId) {
        parts.push(`parent_id = $${idx++}`);
        values.push(parentId);
        parts.push(`level = $${idx++}`);
        values.push(newLevel);
      }

      if (parts.length === 0) {
        await client.query('COMMIT');
        return current;
      }

      parts.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      const q = `UPDATE sfi_codes SET ${parts.join(', ')} WHERE id = $${idx} RETURNING id`;
      const res = await client.query(q, values);
      const updated = res.rows[0];
      if (!updated) {
        await client.query('ROLLBACK');
        return null;
      }

      if (hasParentId) {
        const delta = (Number(newLevel) || 1) - (Number(current.level) || 1);
        if (delta !== 0) {
          await client.query(
            `
            WITH RECURSIVE subtree AS (
              SELECT id
              FROM sfi_codes
              WHERE id = $1

              UNION ALL

              SELECT child.id
              FROM sfi_codes child
              JOIN subtree s ON child.parent_id = s.id
            )
            UPDATE sfi_codes sc
            SET level = sc.level + $2,
                updated_at = CURRENT_TIMESTAMP
            FROM subtree
            WHERE sc.id = subtree.id
              AND sc.id <> $1
            `,
            [Number(id), delta]
          );
        }
      }

      await client.query('COMMIT');
      return await SfiCode.findById(id);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) {}
      throw err;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const childChk = await pool.query('SELECT 1 FROM sfi_codes WHERE parent_id = $1 LIMIT 1', [Number(id)]);
    if (childChk.rowCount > 0) {
      const err = new Error('SFI code has child items and cannot be deleted');
      err.statusCode = 400;
      throw err;
    }
    const res = await pool.query('DELETE FROM sfi_codes WHERE id = $1', [Number(id)]);
    return res.rowCount > 0;
  }
}

module.exports = SfiCode;
