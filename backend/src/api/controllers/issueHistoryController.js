const IssuesService = require('./issuesController') || require('../../api/controllers/issuesController');
const IssuesServiceSvc = require('../services/issuesService');
const IssueHistory = require('../../db/models/IssueHistory');
const pool = require('../../db/connection');

/**
 * Controller to expose issue history entries.
 */
class IssueHistoryController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const issueId = Number(req.params.id);
      if (!issueId || Number.isNaN(issueId)) { const err = new Error('Invalid issue id'); err.statusCode = 400; throw err; }
      // Reuse IssuesService.getIssueById to enforce permissions
      const IssuesService = require('../services/issuesService');
      await IssuesService.getIssueById(issueId, actor);
      const rows = await IssueHistory.listByIssue(issueId);
      if (!rows || rows.length === 0) return res.json([]);

      const parseVal = (v) => {
        if (v === null || typeof v === 'undefined') return null;
        try { return JSON.parse(v); } catch (e) { if (/^\d+$/.test(String(v))) return Number(v); return v; }
      };

      const projectIds = new Set();
      const statusIds = new Set();
      const typeIds = new Set();
      const userIdsFromValues = new Set();

      const parsed = rows.map(r => Object.assign({}, r, { _old: parseVal(r.old_value), _new: parseVal(r.new_value) }));
      for (const r of parsed) {
        const k = r.field_name;
        const collect = (v) => {
          if (v === null || typeof v === 'undefined') return;
          if (Array.isArray(v)) return v.forEach(n => collect(n));
          if (typeof v === 'number') {
            switch (k) {
              case 'project_id': projectIds.add(v); break;
              case 'status_id': statusIds.add(v); break;
              case 'type_id': typeIds.add(v); break;
              case 'assignee_id': userIdsFromValues.add(v); break;
              case 'author_id': userIdsFromValues.add(v); break;
              default: break;
            }
          } else if (typeof v === 'string' && /^\d+$/.test(v)) collect(Number(v));
        };
        collect(r._old); collect(r._new);
      }

      const queries = [];
      queries.push(projectIds.size ? pool.query('SELECT id, name FROM projects WHERE id = ANY($1::int[])', [[...projectIds]]) : Promise.resolve({ rows: [] }));
      queries.push(statusIds.size ? pool.query('SELECT id, name FROM issue_status WHERE id = ANY($1::int[])', [[...statusIds]]) : Promise.resolve({ rows: [] }));
      queries.push(typeIds.size ? pool.query('SELECT id, name FROM issue_type WHERE id = ANY($1::int[])', [[...typeIds]]) : Promise.resolve({ rows: [] }));
      queries.push(userIdsFromValues.size ? pool.query('SELECT id, username, first_name, last_name, middle_name, email, avatar_id FROM users WHERE id = ANY($1::int[])', [[...userIdsFromValues]]) : Promise.resolve({ rows: [] }));

      const [projectsRes, statusesRes, typesRes, usersValsRes] = await Promise.all(queries);
      const projectMap = new Map((projectsRes.rows || []).map(r => [r.id, r.name]));
      const statusMap = new Map((statusesRes.rows || []).map(r => [r.id, r.name]));
      const typeMap = new Map((typesRes.rows || []).map(r => [r.id, r.name]));
      const usersValMap = new Map((usersValsRes.rows || []).map(u => [u.id, u]));

      const mkUserDisplay = (u) => { if (!u) return null; const parts = []; if (u.last_name) parts.push(u.last_name); if (u.first_name) parts.push(u.first_name); if (u.middle_name) parts.push(u.middle_name); const byName = parts.length ? parts.join(' ') : null; return byName || u.username || u.email || null; };

      // Also enrich changed_by users
      const cbUserIds = [...new Set(parsed.map(r => r.changed_by).filter(Boolean))];
      let cbUsersMap = new Map();
      if (cbUserIds.length) {
        const ures = await pool.query('SELECT id, email, phone, avatar_id, first_name, last_name, middle_name, username FROM users WHERE id = ANY($1::int[])', [cbUserIds]);
        cbUsersMap = new Map((ures.rows || []).map(u => [u.id, u]));
      }

      const out = parsed.map(r => {
        const changedBy = cbUsersMap.get(r.changed_by) || null;
        const changedByUser = changedBy ? { id: changedBy.id, full_name: [changedBy.last_name, changedBy.first_name, changedBy.middle_name].filter(Boolean).join(' ') || changedBy.username || changedBy.email, email: changedBy.email, phone: changedBy.phone, avatar_id: changedBy.avatar_id } : null;

        const replace = (k, v) => {
          if (v === null || typeof v === 'undefined') return null;
          if (Array.isArray(v)) return v.map(x => replace(k, x));
          if (typeof v === 'number') {
            switch (k) {
              case 'project_id': return projectMap.get(v) || v;
              case 'status_id': return statusMap.get(v) || v;
              case 'type_id': return typeMap.get(v) || v;
              case 'assignee_id': {
                const uu = usersValMap.get(v) || null; return mkUserDisplay(uu) || v;
              }
              case 'author_id': {
                const uu = usersValMap.get(v) || null; return mkUserDisplay(uu) || v;
              }
              default: return v;
            }
          }
          if (typeof v === 'string' && /^\d+$/.test(v)) return replace(k, Number(v));
          return v;
        };

        const old_res = replace(r.field_name, r._old);
        const new_res = replace(r.field_name, r._new);
        const base = Object.assign({}, r);
        delete base._old; delete base._new;
        base.user = changedByUser;
        base.old_value = old_res;
        base.new_value = new_res;
        return base;
      });

      return res.json(out);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = IssueHistoryController;
