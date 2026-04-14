const pool = require('../connection');

class WikiArticle {
  static async list(filters = {}) {
    const { id, section_id, is_published, created_by, title, search, page = 1, limit, organization_id, organization_ids } = filters;
    const offset = limit ? (page - 1) * limit : 0;
    const where = [];
    const values = [];
    let idx = 1;
    if (id !== undefined) { where.push(`id = $${idx++}`); values.push(id); }
    if (section_id !== undefined) { where.push(`section_id = $${idx++}`); values.push(section_id); }
    if (is_published !== undefined) { where.push(`is_published = $${idx++}`); values.push(is_published); }
    if (created_by !== undefined) { where.push(`created_by = $${idx++}`); values.push(created_by); }
    if (title) { where.push(`title ILIKE $${idx++}`); values.push(`%${title}%`); }
    if (search) { where.push(`(title ILIKE $${idx} OR content ILIKE $${idx} OR summary ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
    // organization filter: single id or array (guarded by to_regclass so missing table won't break)
    if (organization_id !== undefined) {
      where.push(`(to_regclass('public.wiki_article_organizations') IS NOT NULL AND EXISTS (SELECT 1 FROM wiki_article_organizations wao WHERE wao.article_id = wa.id AND wao.organization_id = $${idx++}))`);
      values.push(organization_id);
    }
    if (Array.isArray(organization_ids) && organization_ids.length > 0) {
      where.push(`(to_regclass('public.wiki_article_organizations') IS NOT NULL AND EXISTS (SELECT 1 FROM wiki_article_organizations wao WHERE wao.article_id = wa.id AND wao.organization_id = ANY($${idx}::int[])))`);
      values.push(organization_ids);
      idx++;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // include aggregated organizations for each article (guard if join table doesn't exist yet)
    let q = `SELECT wa.id, wa.title, wa.slug, wa.content, wa.summary, wa.section_id, wa.is_published, wa.version, wa.created_by, wa.updated_by, wa.created_at, wa.updated_at, wa.published_at,
      (CASE WHEN to_regclass('public.wiki_article_organizations') IS NULL THEN NULL ELSE (SELECT json_agg(row_to_json(o.*)) FROM (SELECT o.id, o.name FROM wiki_article_organizations wao JOIN organizations o ON o.id = wao.organization_id WHERE wao.article_id = wa.id) o) END) AS organizations
      FROM wiki_articles wa ${whereSql} ORDER BY wa.id`;
    if (limit != null) {
      q += ` LIMIT $${idx++} OFFSET $${idx}`;
      values.push(limit, offset);
    } else if (offset) {
      q += ` OFFSET $${idx}`;
      values.push(offset);
    }
    const res = await pool.query(q, values);
    return res.rows;
  }

  static async findById(id) {
    const q = `SELECT wa.id, wa.title, wa.slug, wa.content, wa.summary, wa.section_id, wa.is_published, wa.version, wa.created_by, wa.updated_by, wa.created_at, wa.updated_at, wa.published_at,
      (CASE WHEN to_regclass('public.wiki_article_organizations') IS NULL THEN NULL ELSE (SELECT json_agg(row_to_json(o.*)) FROM (SELECT o.id, o.name FROM wiki_article_organizations wao JOIN organizations o ON o.id = wao.organization_id WHERE wao.article_id = wa.id) o) END) AS organizations
      FROM wiki_articles wa WHERE wa.id = $1 LIMIT 1`;
    const res = await pool.query(q, [id]);
    return res.rows[0] || null;
  }

  static async create(fields) {
    const allowed = ['title','slug','content','summary','section_id','is_published','version','created_by','updated_by','published_at'];
    const cols = [];
    const placeholders = [];
    const values = [];
    let idx = 1;
    for (const c of allowed) {
      if (fields[c] !== undefined) {
        cols.push(c);
        placeholders.push(`$${idx++}`);
        values.push(fields[c] === '' ? null : fields[c]);
      }
    }
    if (cols.length === 0) throw new Error('No fields provided for insert');
    const q = `INSERT INTO wiki_articles (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id, title, slug, content, summary, section_id, is_published, version, created_by, updated_by, created_at, updated_at, published_at`;
    const res = await pool.query(q, values);
    const art = res.rows[0];
    // attach organizations if provided
    try {
      if (art && Array.isArray(fields.organizations) && fields.organizations.length > 0) {
        const orgVals = [];
        const placeholdersOrg = [];
        let ix = 1;
        for (const orgId of fields.organizations) {
          placeholdersOrg.push(`($${ix++}, $${ix++}, $${ix++})`);
          orgVals.push(art.id, orgId, fields.created_by || null);
        }
        const q2 = `INSERT INTO wiki_article_organizations (article_id, organization_id, created_by) VALUES ${placeholdersOrg.join(', ')} ON CONFLICT DO NOTHING`;
        await pool.query(q2, orgVals);
      }
    } catch (e) {}
    // try to record initial history/version if table exists
    try {
      if (art && art.version) {
        await pool.query(`INSERT INTO wiki_articles_history (article_id, version, title, content, summary, changed_by) VALUES ($1,$2,$3,$4,$5,$6)`, [art.id, art.version, art.title, art.content, art.summary, art.created_by]);
      }
    } catch (e) {}
    return art;
  }

  static async update(id, fields) {
    const parts = [];
    const values = [];
    let idx = 1;
    ['title','slug','content','summary','section_id','is_published','version','updated_by','published_at'].forEach((k) => {
      if (fields[k] !== undefined) { parts.push(`${k} = $${idx++}`); values.push(fields[k]); }
    });
    if (parts.length === 0) return await WikiArticle.findById(id);
    const q = `UPDATE wiki_articles SET ${parts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, title, slug, content, summary, section_id, is_published, version, created_by, updated_by, created_at, updated_at, published_at`;
    values.push(id);
    const res = await pool.query(q, values);
    const updated = res.rows[0] || null;
    try {
      if (updated && fields.version !== undefined) {
        await pool.query(`INSERT INTO wiki_articles_history (article_id, version, title, content, summary, changed_by) VALUES ($1,$2,$3,$4,$5,$6)`, [updated.id, fields.version, updated.title, updated.content, updated.summary, updated.updated_by || updated.created_by]);
      }
    } catch (e) {}
    // synchronize organizations if provided (replace existing links)
    try {
      if (updated && Array.isArray(fields.organizations)) {
        await pool.query(`DELETE FROM wiki_article_organizations WHERE article_id = $1`, [updated.id]);
        if (fields.organizations.length > 0) {
          const orgVals = [];
          const placeholdersOrg = [];
          let ix = 1;
          for (const orgId of fields.organizations) {
            placeholdersOrg.push(`($${ix++}, $${ix++}, $${ix++})`);
            orgVals.push(updated.id, orgId, fields.updated_by || null);
          }
          const q3 = `INSERT INTO wiki_article_organizations (article_id, organization_id, created_by) VALUES ${placeholdersOrg.join(', ')} ON CONFLICT DO NOTHING`;
          await pool.query(q3, orgVals);
        }
      }
    } catch (e) {}
    return updated;
  }

  static async softDelete(id) {
    try {
      const q = `UPDATE wiki_articles SET is_published = false WHERE id = $1`;
      const res = await pool.query(q, [id]);
      if (res.rowCount > 0) return true;
    } catch (err) {}
    const q2 = `DELETE FROM wiki_articles WHERE id = $1`;
    const res2 = await pool.query(q2, [id]);
    return res2.rowCount > 0;
  }
}

module.exports = WikiArticle;
