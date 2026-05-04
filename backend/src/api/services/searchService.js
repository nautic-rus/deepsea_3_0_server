// MiniSearch removed — using Elasticsearch as primary search engine
const pool = require('../../db/connection');
const { getPermissionProjectScope } = require('./permissionChecker');
const { ensureIndex, bulkIndex, search: esSearch, ELASTIC_INDEX } = require('../../lib/elasticClient');

const ENTITY_DOCUMENT = 'documents';
const ENTITY_ISSUE = 'issues';
const ENTITY_CUSTOMER_QUESTION = 'customer_questions';

function normalizeProjectIds(projectIdFilter) {
  if (projectIdFilter === undefined || projectIdFilter === null) return null;
  const ids = Array.isArray(projectIdFilter)
    ? projectIdFilter.map(v => Number(v)).filter(v => !Number.isNaN(v))
    : String(projectIdFilter).split(',').map(s => Number(s.trim())).filter(v => !Number.isNaN(v));
  return ids.length ? ids : [];
}

function normalizeEntities(rawEntities) {
  if (!rawEntities) return [ENTITY_DOCUMENT, ENTITY_ISSUE, ENTITY_CUSTOMER_QUESTION];
  const values = Array.isArray(rawEntities) ? rawEntities : String(rawEntities).split(',');
  const normalized = values.map(v => String(v).trim().toLowerCase()).filter(Boolean);
  const allowed = new Set([ENTITY_DOCUMENT, ENTITY_ISSUE, ENTITY_CUSTOMER_QUESTION]);
  const result = normalized.filter(v => allowed.has(v));
  return result.length ? [...new Set(result)] : [ENTITY_DOCUMENT, ENTITY_ISSUE, ENTITY_CUSTOMER_QUESTION];
}

function parseLimit(limit) {
  const n = Number(limit);
  if (Number.isNaN(n) || n <= 0) return 20;
  return Math.min(n, 100);
}

function parseOffset(offset) {
  const n = Number(offset);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function stripHtml(value) {
  const text = String(value || '');
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeUnicode(input) {
  const text = String(input || '').toLowerCase();
  return text.match(/[\p{L}\p{N}]+/gu) || [];
}

function isNumericLikeQuery(query) {
  return /^[0-9]+(?:[./_-][0-9]+)*$/.test(String(query || '').trim());
}

function containsNormalized(value, query) {
  const hay = String(value || '').toLowerCase();
  const needle = String(query || '').toLowerCase();
  if (!needle) return false;
  return hay.includes(needle);
}

function rerankResults(found, query, numericLike) {
  const queryStr = String(query || '').trim();

  return (found || [])
    .map((item, idx) => {
      let adjustedScore = Number(item.score || 0);

      const inCode = containsNormalized(item.code, queryStr);
      const inTitle = containsNormalized(item.title, queryStr);
      const inComment = containsNormalized(item.comment, queryStr);
      const inProjectCode = containsNormalized(item.project_code, queryStr);
      const inDescription = containsNormalized(item.description, queryStr);
      const inEntityId = containsNormalized(item.entity_id_text, queryStr);
      const inProjectId = containsNormalized(item.project_id_text, queryStr);

      if (inEntityId) adjustedScore += 160;
      if (inProjectId) adjustedScore += 70;
      if (inCode) adjustedScore += 120;
      if (inTitle) adjustedScore += 40;
      if (inComment) adjustedScore += 30;
      if (inProjectCode) adjustedScore += 25;
      if (inDescription) adjustedScore += 10;

      if (String(item.code || '').toLowerCase().startsWith(queryStr.toLowerCase())) {
        adjustedScore += 30;
      }

      if (numericLike && !inEntityId && !inProjectId && !inCode && !inTitle && !inComment && !inProjectCode && !inDescription) {
        adjustedScore -= 100;
      }

      return {
        ...item,
        score: adjustedScore,
        _sort_idx: idx
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a._sort_idx - b._sort_idx;
    })
    .map(({ _sort_idx, ...item }) => item);
}



function addScopeFilter({ where, values, idx, alias, scope, projectIdFilter }) {
  const requestedProjectIds = normalizeProjectIds(projectIdFilter);

  if (requestedProjectIds && requestedProjectIds.length === 0) {
    where.push('1 = 0');
    return idx;
  }

  if (scope.hasGlobal) {
    if (requestedProjectIds && requestedProjectIds.length > 0) {
      where.push(`${alias}.project_id = ANY($${idx}::int[])`);
      values.push(requestedProjectIds);
      idx += 1;
    }
    return idx;
  }

  const allowed = Array.isArray(scope.projectIds) ? scope.projectIds : [];
  if (!allowed.length) {
    where.push('1 = 0');
    return idx;
  }

  if (requestedProjectIds && requestedProjectIds.length > 0) {
    const filtered = requestedProjectIds.filter(pid => allowed.includes(pid));
    if (!filtered.length) {
      where.push('1 = 0');
      return idx;
    }
    where.push(`${alias}.project_id = ANY($${idx}::int[])`);
    values.push(filtered);
    idx += 1;
    return idx;
  }

  where.push(`${alias}.project_id = ANY($${idx}::int[])`);
  values.push(allowed);
  idx += 1;
  return idx;
}

async function fetchDocuments(scope, projectIdFilter, updatedAfter = null) {
  const where = ['d.is_active = true'];
  const values = [];
  let idx = 1;
  idx = addScopeFilter({ where, values, idx, alias: 'd', scope, projectIdFilter });
  if (updatedAfter) {
    where.push(`${'d'}.updated_at > $${idx}`);
    values.push(updatedAfter);
    idx += 1;
  }

  const q = `
    SELECT
      'documents' AS entity_type,
      d.id AS entity_id,
      d.project_id,
      d.title,
      d.description,
      d.code,
      d.comment,
      d.priority,
      d.created_at,
      d.updated_at,
      p.name AS project_name,
      p.code AS project_code,
      ds.name AS status_name,
      dt.name AS type_name,
      st.name AS stage_name,
      sp.name AS specialization_name,
      TRIM(CONCAT_WS(' ', au.last_name, au.first_name, au.middle_name)) AS author_name,
      TRIM(CONCAT_WS(' ', asg.last_name, asg.first_name, asg.middle_name)) AS assignee_name,
      TRIM(CONCAT_WS(' ', rsp.last_name, rsp.first_name, rsp.middle_name)) AS responsible_name,
      COALESCE(msg.messages_text, '') AS messages_text,
      COALESCE(fls.files_text, '') AS files_text,
      COALESCE(lnk.links_text, '') AS links_text
    FROM documents d
    LEFT JOIN projects p ON p.id = d.project_id
    LEFT JOIN document_status ds ON ds.id = d.status_id
    LEFT JOIN document_type dt ON dt.id = d.type_id
    LEFT JOIN stages st ON st.id = d.stage_id
    LEFT JOIN specializations sp ON sp.id = d.specialization_id
    LEFT JOIN users au ON au.id = d.created_by
    LEFT JOIN users asg ON asg.id = d.assigne_to
    LEFT JOIN users rsp ON rsp.id = d.responsible_id
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(dm.content, ' ') AS messages_text
      FROM document_messages dm
      WHERE dm.document_id = d.id
    ) msg ON TRUE
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(CONCAT_WS(' ', s.file_name, s.object_key, s.mime_type), ' ') AS files_text
      FROM documents_storage dss
      JOIN storage s ON s.id = dss.storage_id
      WHERE dss.document_id = d.id
    ) fls ON TRUE
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(CONCAT_WS(' ', el.relation_type, el.active_type, el.passive_type), ' ') AS links_text
      FROM entity_links el
      WHERE (el.active_type = 'document' AND el.active_id = d.id)
        OR (el.passive_type = 'document' AND el.passive_id = d.id)
    ) lnk ON TRUE
    WHERE ${where.join(' AND ')}
  `;

  const res = await pool.query(q, values);
  return res.rows || [];
}

async function fetchIssues(scope, projectIdFilter, updatedAfter = null) {
  const where = ['i.is_active = true'];
  const values = [];
  let idx = 1;
  idx = addScopeFilter({ where, values, idx, alias: 'i', scope, projectIdFilter });
  if (updatedAfter) {
    where.push(`${'i'}.updated_at > $${idx}`);
    values.push(updatedAfter);
    idx += 1;
  }

  const q = `
    SELECT
      'issues' AS entity_type,
      i.id AS entity_id,
      i.project_id,
      i.title,
      i.description,
      NULL::text AS code,
      i.comment,
      i.priority,
      i.created_at,
      i.updated_at,
      p.name AS project_name,
      p.code AS project_code,
      ist.name AS status_name,
      it.name AS type_name,
      NULL::text AS stage_name,
      NULL::text AS specialization_name,
      TRIM(CONCAT_WS(' ', au.last_name, au.first_name, au.middle_name)) AS author_name,
      TRIM(CONCAT_WS(' ', asg.last_name, asg.first_name, asg.middle_name)) AS assignee_name,
      NULL::text AS responsible_name,
      COALESCE(msg.messages_text, '') AS messages_text,
      COALESCE(fls.files_text, '') AS files_text,
      COALESCE(lnk.links_text, '') AS links_text
    FROM issues i
    LEFT JOIN projects p ON p.id = i.project_id
    LEFT JOIN issue_status ist ON ist.id = i.status_id
    LEFT JOIN issue_type it ON it.id = i.type_id
    LEFT JOIN users au ON au.id = i.author_id
    LEFT JOIN users asg ON asg.id = i.assignee_id
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(im.content, ' ') AS messages_text
      FROM issue_messages im
      WHERE im.issue_id = i.id
    ) msg ON TRUE
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(CONCAT_WS(' ', s.file_name, s.object_key, s.mime_type), ' ') AS files_text
      FROM issue_storage iss
      JOIN storage s ON s.id = iss.storage_id
      WHERE iss.issue_id = i.id
    ) fls ON TRUE
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(CONCAT_WS(' ', el.relation_type, el.active_type, el.passive_type), ' ') AS links_text
      FROM entity_links el
      WHERE (el.active_type = 'issue' AND el.active_id = i.id)
        OR (el.passive_type = 'issue' AND el.passive_id = i.id)
    ) lnk ON TRUE
    WHERE ${where.join(' AND ')}
  `;

  const res = await pool.query(q, values);
  return res.rows || [];
}

async function fetchCustomerQuestions(scope, projectIdFilter, updatedAfter = null) {
  const where = ['cq.is_active = true'];
  const values = [];
  let idx = 1;
  idx = addScopeFilter({ where, values, idx, alias: 'cq', scope, projectIdFilter });
  if (updatedAfter) {
    where.push(`${'cq'}.updated_at > $${idx}`);
    values.push(updatedAfter);
    idx += 1;
  }

  const q = `
    SELECT
      'customer_questions' AS entity_type,
      cq.id AS entity_id,
      cq.project_id,
      cq.question_title AS title,
      cq.question_text AS description,
      NULL::text AS code,
      cq.comment,
      cq.priority,
      cq.created_at,
      cq.updated_at,
      p.name AS project_name,
      p.code AS project_code,
      cqs.name AS status_name,
      cqt.name AS type_name,
      NULL::text AS stage_name,
      sp.name AS specialization_name,
      TRIM(CONCAT_WS(' ', au.last_name, au.first_name, au.middle_name)) AS author_name,
      TRIM(CONCAT_WS(' ', ans.last_name, ans.first_name, ans.middle_name)) AS assignee_name,
      NULL::text AS responsible_name,
      COALESCE(msg.messages_text, '') AS messages_text,
      COALESCE(fls.files_text, '') AS files_text,
      COALESCE(lnk.links_text, '') AS links_text
    FROM customer_questions cq
    LEFT JOIN projects p ON p.id = cq.project_id
    LEFT JOIN customer_question_status cqs ON cqs.id = cq.status_id
    LEFT JOIN customer_question_type cqt ON cqt.id = cq.type_id
    LEFT JOIN specializations sp ON sp.id = cq.specialization_id
    LEFT JOIN users au ON au.id = cq.asked_by
    LEFT JOIN users ans ON ans.id = cq.answered_by
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(cqm.content, ' ') AS messages_text
      FROM customer_question_messages cqm
      WHERE cqm.customer_question_id = cq.id
    ) msg ON TRUE
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(CONCAT_WS(' ', s.file_name, s.object_key, s.mime_type), ' ') AS files_text
      FROM customer_questions_storage cqs2
      JOIN storage s ON s.id = cqs2.storage_id
      WHERE cqs2.customer_question_id = cq.id
    ) fls ON TRUE
    LEFT JOIN LATERAL (
      SELECT STRING_AGG(CONCAT_WS(' ', el.relation_type, el.active_type, el.passive_type), ' ') AS links_text
      FROM entity_links el
      WHERE (el.active_type = 'customer_question' AND el.active_id = cq.id)
        OR (el.passive_type = 'customer_question' AND el.passive_id = cq.id)
    ) lnk ON TRUE
    WHERE ${where.join(' AND ')}
  `;

  const res = await pool.query(q, values);
  return res.rows || [];
}

class SearchService {
  static async searchGlobal(searchText, actor, options = {}) {
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const query = String(searchText || '').trim();
    if (!query) {
      return { items: [], total: 0, limit: parseLimit(options.limit), offset: parseOffset(options.offset), query: '' };
    }

    const entities = normalizeEntities(options.entities);
    const limit = parseLimit(options.limit);
    const offset = parseOffset(options.offset);

    const [documentScope, issueScope, customerQuestionScope] = await Promise.all([
      getPermissionProjectScope(actor, 'documents.view'),
      getPermissionProjectScope(actor, 'issues.view'),
      getPermissionProjectScope(actor, 'customer_questions.view')
    ]);

    const tasks = [];

    if (entities.includes(ENTITY_DOCUMENT) && (documentScope.hasGlobal || (documentScope.projectIds || []).length > 0)) {
      tasks.push(fetchDocuments(documentScope, options.project_id));
    }

    if (entities.includes(ENTITY_ISSUE) && (issueScope.hasGlobal || (issueScope.projectIds || []).length > 0)) {
      tasks.push(fetchIssues(issueScope, options.project_id));
    }

    if (entities.includes(ENTITY_CUSTOMER_QUESTION) && (customerQuestionScope.hasGlobal || (customerQuestionScope.projectIds || []).length > 0)) {
      tasks.push(fetchCustomerQuestions(customerQuestionScope, options.project_id));
    }

    if (tasks.length === 0) {
      return { items: [], total: 0, limit, offset, query };
    }

    const results = await Promise.all(tasks);
    const rows = results.flat().map(row => ({
      ...row,
      id: `${row.entity_type}:${row.entity_id}`,
      entity_id_text: row.entity_id !== null && row.entity_id !== undefined ? String(row.entity_id) : '',
      project_id_text: row.project_id !== null && row.project_id !== undefined ? String(row.project_id) : '',
      title: stripHtml(row.title),
      description: stripHtml(row.description),
      code: stripHtml(row.code),
      comment: stripHtml(row.comment),
      project_name: stripHtml(row.project_name),
      project_code: stripHtml(row.project_code),
      status_name: stripHtml(row.status_name),
      type_name: stripHtml(row.type_name),
      stage_name: stripHtml(row.stage_name),
      specialization_name: stripHtml(row.specialization_name),
      author_name: stripHtml(row.author_name),
      assignee_name: stripHtml(row.assignee_name),
      responsible_name: stripHtml(row.responsible_name),
      priority: stripHtml(row.priority),
      messages_text: stripHtml(row.messages_text),
      files_text: stripHtml(row.files_text),
      links_text: stripHtml(row.links_text)
    }));

    if (!rows.length) {
      return { items: [], total: 0, limit, offset, query };
    }

    const useElastic = String(process.env.USE_ELASTIC || '').toLowerCase() === 'true';

    if (useElastic) {
      // Ensure index exists and perform initial bulk index on first use
      if (!SearchService._esReady) {
        await ensureIndex();
        // bulk index current rows
        try {
          await bulkIndex(rows);
        } catch (err) {
          // if bulk indexing fails, fall back to in-memory minisearch below
          SearchService._esReady = false;
          console.error('Elastic bulk index failed, falling back to MiniSearch:', err && err.message);
        }
        SearchService._esReady = true;
      }

      const numericLikeQuery = isNumericLikeQuery(query);

      const should = [];
      if (numericLikeQuery) {
        should.push({ match_phrase_prefix: { code: { query, boost: 6 } } });
        should.push({ match_phrase_prefix: { title: { query, boost: 2 } } });
      } else {
        should.push({
          multi_match: {
            query,
            type: 'most_fields',
            fields: [
              'title^4',
              'code^4',
              'messages_text^1.5',
              'files_text^1.5',
              'description'
            ],
            fuzziness: 'AUTO'
          }
        });
      }

      // Filter by entity types
      const filter = [];
      if (entities && entities.length) {
        filter.push({ terms: { entity_type: entities } });
      }

      // If user provided project filter, add filter (normalized earlier in addScopeFilter usage)
      const requestedProjectIds = normalizeProjectIds(options.project_id);
      if (requestedProjectIds && requestedProjectIds.length > 0) {
        filter.push({ terms: { project_id_text: requestedProjectIds.map(String) } });
      }

      const body = {
        query: {
          bool: {
            should,
            filter,
            minimum_should_match: 1
          }
        },
        from: offset,
        size: limit
      };

      const res = await esSearch(ELASTIC_INDEX, body);
      const hits = (res.hits && res.hits.hits) || [];
      const mapped = hits.map((h, idx) => {
        const src = h._source || {};
        // _id contains our composite id like "entityType:entityId"
        const idRaw = h._id || src.id || '';
        const [etype, eid] = String(idRaw).split(':');
        return {
          id: idRaw,
          entity_type: etype || null,
          entity_id: eid ? Number(eid) : null,
          title: src.title || '',
          description: src.description || '',
          code: src.code || '',
          comment: src.comment || '',
          messages_text: src.messages_text || '',
          files_text: src.files_text || '',
          score: h._score || 0,
          _sort_idx: idx
        };
      });

      const reranked = rerankResults(mapped, query, numericLikeQuery);
      const sliced = reranked.slice(0, limit).map(item => ({
        score: item.score,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        title: item.title,
        description: item.description,
        code: item.code,
        comment: item.comment,
        messages_text: item.messages_text,
        files_text: item.files_text
      }));

      return {
        items: sliced,
        total: (res.hits && res.hits.total && (res.hits.total.value || res.hits.total)) || hits.length,
        limit,
        offset,
        query
      };
    }

    // If USE_ELASTIC is not enabled, return empty (ES-only mode expected)
    return { items: [], total: 0, limit, offset, query };
  }
}

// Reindex helper: index all accessible rows (run as admin/with global scope)
SearchService.reindexToElastic = async function reindexToElastic() {
  const useElastic = String(process.env.USE_ELASTIC || '').toLowerCase() === 'true';
  if (!useElastic) throw new Error('Elasticsearch is not enabled (set USE_ELASTIC=true)');
  await ensureIndex();
  const allRows = [];
  // fetch with global scope
  const globalScope = { hasGlobal: true, projectIds: [] };
  const docs = await fetchDocuments(globalScope, null);
  const issues = await fetchIssues(globalScope, null);
  const cqs = await fetchCustomerQuestions(globalScope, null);
  const rows = [...docs, ...issues, ...cqs].map(row => ({
    ...row,
    id: `${row.entity_type}:${row.entity_id}`,
    entity_id_text: row.entity_id !== null && row.entity_id !== undefined ? String(row.entity_id) : '',
    project_id_text: row.project_id !== null && row.project_id !== undefined ? String(row.project_id) : '',
    title: stripHtml(row.title),
    description: stripHtml(row.description),
    code: stripHtml(row.code),
    comment: stripHtml(row.comment),
    project_name: stripHtml(row.project_name),
    project_code: stripHtml(row.project_code),
    status_name: stripHtml(row.status_name),
    type_name: stripHtml(row.type_name),
    stage_name: stripHtml(row.stage_name),
    specialization_name: stripHtml(row.specialization_name),
    author_name: stripHtml(row.author_name),
    assignee_name: stripHtml(row.assignee_name),
    responsible_name: stripHtml(row.responsible_name),
    priority: stripHtml(row.priority),
    messages_text: stripHtml(row.messages_text),
    files_text: stripHtml(row.files_text),
    links_text: stripHtml(row.links_text)
  }));
  await bulkIndex(rows);
  SearchService._esReady = true;
  return { indexed: rows.length };
};

module.exports = SearchService;
// Export helper fetchers for external sync tooling
module.exports.fetchDocuments = fetchDocuments;
module.exports.fetchIssues = fetchIssues;
module.exports.fetchCustomerQuestions = fetchCustomerQuestions;
