const CustomerQuestionsController = require('./customerQuestionsController') || require('../../api/controllers/customerQuestionsController');
const CustomerQuestionsService = require('../services/customerQuestionsService');
const CustomerQuestionHistory = require('../../db/models/CustomerQuestionHistory');
const pool = require('../../db/connection');

class CustomerQuestionHistoryController {
  static async list(req, res, next) {
    try {
      const actor = req.user;
      const questionId = Number(req.params.id);
      if (!questionId || Number.isNaN(questionId)) { const err = new Error('Invalid question id'); err.statusCode = 400; throw err; }
      // Enforce base access checks by reusing service
      const QuestionsService = require('../services/customerQuestionsService');
      const question = await QuestionsService.getCustomerQuestionById(questionId, actor);
      // Additionally require customer_questions.history permission (global or for the question's project)
      const { hasPermission, hasPermissionForProject } = require('../services/permissionChecker');
      const requiredPermission = 'customer_questions.history';
      const hasGlobal = await hasPermission(actor, requiredPermission);
      const hasProject = question && question.project_id ? await hasPermissionForProject(actor, requiredPermission, question.project_id) : false;
      if (!hasGlobal && !hasProject) { const err = new Error('Forbidden: missing permission customer_questions.history'); err.statusCode = 403; throw err; }
      let rows = await CustomerQuestionHistory.listByQuestion(questionId);
      if (!rows || rows.length === 0) return res.json([]);

      const parseVal = (v) => {
        if (v === null || typeof v === 'undefined') return null;
        try { return JSON.parse(v); } catch (e) { if (/^\d+$/.test(String(v))) return Number(v); return v; }
      };

      const userIdsFromValues = new Set();
      const statusIdsFromValues = new Set();
      const typeIdsFromValues = new Set();

      const parsed = rows.map(r => Object.assign({}, r, { _old: parseVal(r.old_value), _new: parseVal(r.new_value) }));
      for (const r of parsed) {
        const k = r.field_name;
        const collect = (v) => {
          if (v === null || typeof v === 'undefined') return;
          if (Array.isArray(v)) return v.forEach(n => collect(n));
          if (typeof v === 'number') {
            switch (k) {
              case 'assignee_id': userIdsFromValues.add(v); break;
              case 'status_id': statusIdsFromValues.add(v); break;
              case 'type_id': typeIdsFromValues.add(v); break;
              case 'author_id': userIdsFromValues.add(v); break;
              default: break;
            }
          } else if (typeof v === 'string' && /^\d+$/.test(v)) collect(Number(v));
        };
        collect(r._old); collect(r._new);
      }

      const queries = [];
      queries.push(userIdsFromValues.size ? pool.query('SELECT id, username, first_name, last_name, middle_name, email, avatar_id FROM users WHERE id = ANY($1::int[])', [[...userIdsFromValues]]) : Promise.resolve({ rows: [] }));
      queries.push(statusIdsFromValues.size ? pool.query('SELECT id, name FROM customer_question_status WHERE id = ANY($1::int[])', [[...statusIdsFromValues]]) : Promise.resolve({ rows: [] }));
      queries.push(typeIdsFromValues.size ? pool.query('SELECT id, name FROM customer_question_type WHERE id = ANY($1::int[])', [[...typeIdsFromValues]]) : Promise.resolve({ rows: [] }));

      const [usersValsRes, statusesRes, typesRes] = await Promise.all(queries);
      const usersValMap = new Map((usersValsRes.rows || []).map(u => [u.id, u]));
      const statusesMap = new Map((statusesRes.rows || []).map(s => [s.id, s.name]));
      const typesMap = new Map((typesRes.rows || []).map(t => [t.id, t.name]));

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
              case 'assignee_id': {
                const uu = usersValMap.get(v) || null; return mkUserDisplay(uu) || v;
              }
              case 'author_id': {
                const uu = usersValMap.get(v) || null; return mkUserDisplay(uu) || v;
              }
              case 'status_id': {
                return statusesMap.get(v) || v;
              }
              case 'type_id': {
                return typesMap.get(v) || v;
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

module.exports = CustomerQuestionHistoryController;
