const DocumentHistory = require('../../db/models/DocumentHistory');
const pool = require('../../db/connection');

/**
 * Controller to expose document history entries.
 */
class DocumentHistoryController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const documentId = Number(req.params.id);
      if (!documentId || Number.isNaN(documentId)) { const err = new Error('Invalid document id'); err.statusCode = 400; throw err; }
      // Reuse DocumentsService.getDocumentById to enforce permissions
      const DocumentsService = require('../services/documentsService');
      await DocumentsService.getDocumentById(documentId, actor);
      const rows = await DocumentHistory.listByDocument(documentId);
      if (!rows || rows.length === 0) return res.json([]);

      // Enrich history entries with user info (from changed_by)
      const userIds = [...new Set(rows.map(r => r.changed_by).filter(Boolean))];
      let usersMap = new Map();
      if (userIds.length) {
        const q = `SELECT id, email, phone, avatar_id, first_name, last_name, middle_name, username FROM users WHERE id = ANY($1::int[])`;
        const ures = await pool.query(q, [userIds]);
        usersMap = new Map((ures.rows || []).map(u => [u.id, u]));
      }

      // Parse old/new values and collect ids to resolve into names
      const parseVal = (v) => {
        if (v === null || typeof v === 'undefined') return null;
        try {
          return JSON.parse(v);
        } catch (e) {
          // not JSON, return raw string or number
          if (/^\d+$/.test(String(v))) return Number(v);
          return v;
        }
      };

      const projectIds = new Set();
      const stageIds = new Set();
      const statusIds = new Set();
      const specIds = new Set();
      const dirIds = new Set();
      const typeIds = new Set();
      const userIdsFromValues = new Set();

      const parsedRows = rows.map(r => {
        const oldVal = parseVal(r.old_value);
        const newVal = parseVal(r.new_value);
        return Object.assign({}, r, { _old: oldVal, _new: newVal });
      });

      for (const r of parsedRows) {
        const k = r.field_name;
        const collect = (v) => {
          if (v === null || typeof v === 'undefined') return;
          if (Array.isArray(v)) v.forEach(n => collect(n));
          else if (typeof v === 'number') {
            switch (k) {
              case 'project_id': projectIds.add(v); break;
              case 'stage_id': stageIds.add(v); break;
              case 'status_id': statusIds.add(v); break;
              case 'specialization_id': specIds.add(v); break;
              case 'directory_id': dirIds.add(v); break;
              case 'type_id': typeIds.add(v); break;
              case 'assigne_to': userIdsFromValues.add(v); break;
              default: break;
            }
          } else if (typeof v === 'string' && /^\d+$/.test(v)) {
            const n = Number(v);
            collect(n);
          }
        };
        collect(r._old);
        collect(r._new);
      }

      // Query referenced tables in parallel
      const queries = [];
      queries.push(projectIds.size ? pool.query('SELECT id, name FROM projects WHERE id = ANY($1::int[])', [[...projectIds]]) : Promise.resolve({ rows: [] }));
      queries.push(stageIds.size ? pool.query('SELECT id, name FROM stages WHERE id = ANY($1::int[])', [[...stageIds]]) : Promise.resolve({ rows: [] }));
      queries.push(statusIds.size ? pool.query('SELECT id, name FROM document_status WHERE id = ANY($1::int[])', [[...statusIds]]) : Promise.resolve({ rows: [] }));
      queries.push(specIds.size ? pool.query('SELECT id, name FROM specializations WHERE id = ANY($1::int[])', [[...specIds]]) : Promise.resolve({ rows: [] }));
      queries.push(dirIds.size ? pool.query(
        `SELECT d.id, d.name, COALESCE(p.path, d.name) AS full_path
         FROM document_directories d
         LEFT JOIN LATERAL (
           WITH RECURSIVE ancestors(id, name, parent_id, depth) AS (
             SELECT id, name, parent_id, 0 FROM document_directories WHERE id = d.id
             UNION ALL
             SELECT dd.id, dd.name, dd.parent_id, ancestors.depth + 1 FROM document_directories dd JOIN ancestors ON dd.id = ancestors.parent_id
           )
           SELECT string_agg(name, '/' ORDER BY depth DESC) AS path FROM ancestors
         ) p ON true
         WHERE d.id = ANY($1::int[])
        `, [[...dirIds]]) : Promise.resolve({ rows: [] }));
      queries.push(typeIds.size ? pool.query('SELECT id, name FROM document_type WHERE id = ANY($1::int[])', [[...typeIds]]) : Promise.resolve({ rows: [] }));
      queries.push(userIdsFromValues.size ? pool.query('SELECT id, username, first_name, last_name, middle_name, email, avatar_id FROM users WHERE id = ANY($1::int[])', [[...userIdsFromValues]]) : Promise.resolve({ rows: [] }));

      const [projectsRes, stagesRes, statusesRes, specsRes, dirsRes, typesRes, usersValsRes] = await Promise.all(queries);

      const projectMap = new Map((projectsRes.rows || []).map(r => [r.id, r.name]));
      const stageMap = new Map((stagesRes.rows || []).map(r => [r.id, r.name]));
      const statusMap = new Map((statusesRes.rows || []).map(r => [r.id, r.name]));
      const specMap = new Map((specsRes.rows || []).map(r => [r.id, r.name]));
  const dirMap = new Map((dirsRes.rows || []).map(r => [r.id, r.full_path || r.name]));
      const typeMap = new Map((typesRes.rows || []).map(r => [r.id, r.name]));
      const usersValMap = new Map((usersValsRes.rows || []).map(u => [u.id, u]));

      const mkUserDisplay = (u) => {
        if (!u) return null;
        const parts = [];
        if (u.last_name) parts.push(u.last_name);
        if (u.first_name) parts.push(u.first_name);
        if (u.middle_name) parts.push(u.middle_name);
        const byName = parts.length ? parts.join(' ') : null;
        return byName || u.username || u.email || null;
      };

      const enriched = parsedRows.map(r => {
        const u = usersMap.get(r.changed_by) || null;
        const changedByUser = u ? { id: u.id, full_name: [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ') || u.username || u.email, email: u.email, phone: u.phone, avatar_id: u.avatar_id } : null;

        const replaceIfMapped = (k, v) => {
          if (v === null || typeof v === 'undefined') return null;
          if (Array.isArray(v)) return v.map(x => replaceIfMapped(k, x));
          if (typeof v === 'number') {
            switch (k) {
              case 'project_id': return projectMap.get(v) || v;
              case 'stage_id': return stageMap.get(v) || v;
              case 'status_id': return statusMap.get(v) || v;
              case 'specialization_id': return specMap.get(v) || v;
              case 'directory_id': return dirMap.get(v) || v;
              case 'type_id': return typeMap.get(v) || v;
              case 'assigne_to': {
                const uu = usersValMap.get(v) || null; return mkUserDisplay(uu) || v;
              }
              default: return v;
            }
          }
          if (typeof v === 'string' && /^\d+$/.test(v)) return replaceIfMapped(k, Number(v));
          return v;
        };

        const outOld = replaceIfMapped(r.field_name, r._old);
        const outNew = replaceIfMapped(r.field_name, r._new);

        // Build final row: replace old_value/new_value with resolved values
        const base = Object.assign({}, r);
        delete base._old; delete base._new;
        base.user = changedByUser;
        base.old_value = outOld;
        base.new_value = outNew;
        return base;
      });

      return res.json(enriched);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = DocumentHistoryController;
