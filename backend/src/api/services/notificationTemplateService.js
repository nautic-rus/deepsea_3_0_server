const fs = require('fs');
const path = require('path');

/**
 * Simple template renderer for notification messages.
 *
 * Supports loading templates from filesystem (optional) at:
 *   src/api/templates/notifications/<event>.<method>.txt
 *   src/api/templates/notifications/<event>.<method>.html
 *
 * If a template file is not found, a sensible fallback is used.
 */

class NotificationTemplateService {
  static templatesCache = {};

  // Safely resolve a dotted path from an object, e.g. 'issue.title'
  static _resolvePath(obj, pathStr) {
    if (!pathStr) return undefined;
    const parts = pathStr.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  // Render a template string replacing {{a.b}} with value from context
  static _renderString(tpl, context = {}) {
    if (!tpl) return tpl;
    return tpl.replace(/\{\{\s*([^\}]+)\s*\}\}/g, (m, key) => {
      const val = NotificationTemplateService._resolvePath(context, key.trim());
      if (val === undefined || val === null) return '';
      // Convert objects to JSON for debug; primitives to string
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });
  }

  static async _loadTemplateFile(event, method, ext) {
    const tplKey = `${event}.${method}.${ext}`;
    if (NotificationTemplateService.templatesCache[tplKey] !== undefined) return NotificationTemplateService.templatesCache[tplKey];

    const templatesDir = path.join(__dirname, '..', 'templates', 'notifications');
    const filePath = path.join(templatesDir, `${event}.${method}.${ext}`);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      NotificationTemplateService.templatesCache[tplKey] = content;
      return content;
    } catch (err) {
      NotificationTemplateService.templatesCache[tplKey] = null;
      return null;
    }
  }

  // Render templates for given event and method. Returns { text, html, subject }
  static async render(event, method, context = {}) {
    // Try filesystem templates first. For email we prefer HTML and do not use plain .txt files
    let textTpl = null;
    let htmlTpl = null;
    if (method === 'email') {
      htmlTpl = await NotificationTemplateService._loadTemplateFile(event, method, 'html');
      // intentionally do not load textTpl for email to enforce HTML templates for mail
    } else {
      textTpl = await NotificationTemplateService._loadTemplateFile(event, method, 'txt');
      htmlTpl = await NotificationTemplateService._loadTemplateFile(event, method, 'html');
    }

    // Defaults: use a generic fallback per method. Do not assume 'issue' fields for unknown events.
    // Include event name in context so defaults/templates can reference it as {{event}}.
    const ctx = Object.assign({ event }, context || {});
    // Provide a generic `url` field for fallbacks: prefer common names used in contexts
    if (!ctx.url) ctx.url = ctx.documentUrl || ctx.issueUrl || ctx.targetUrl || '';
    // Inject common company/support/front-end values from environment if templates expect them
    if (!ctx.company) ctx.company = {
      name: process.env.COMPANY_NAME || 'Deep Sea',
      logo_url: process.env.COMPANY_LOGO_URL || '',
      address: process.env.COMPANY_ADDRESS || ''
    };
    if (!ctx.support_email) ctx.support_email = process.env.SUPPORT_EMAIL || '';
    // loginUrl is commonly used in user-created/password templates
    if (!ctx.loginUrl && process.env.FRONTEND_URL) ctx.loginUrl = `${process.env.FRONTEND_URL.replace(/\/$/, '')}/login`;
    // Ensure actor.full_name exists for templates expecting ФИО
    if (ctx.actor && !ctx.actor.full_name) {
      try {
        const a = ctx.actor || {};
        const parts = [];
        if (a.last_name) parts.push(a.last_name);
        if (a.first_name) parts.push(a.first_name);
        if (a.middle_name) parts.push(a.middle_name);
        const byName = parts.length ? parts.join(' ') : null;
        ctx.actor.full_name = byName || a.username || a.email || '';
      } catch (e) {
        ctx.actor.full_name = ctx.actor.email || '';
      }
    }
    // If `changes` is provided as an object with `before` and `after`,
    // convert it into a readable multi-line string so simple templates
    // (which only support {{key}} replacement) can present history records
    // instead of dumping raw JSON.
    if (ctx.changes && typeof ctx.changes === 'object' && (ctx.changes.before || ctx.changes.after)) {
      try {
        const before = ctx.changes.before || {};
        const after = ctx.changes.after || {};
          // Only consider keys that are present in `after` (partial updates will include
          // only changed fields). Also ignore timestamp-like fields (created_at/updated_at)
          const afterKeys = Object.keys(after || {});
          const isTimestamp = k => /(^|_)updated_at$|(^|_)created_at$|_at$/i.test(k);
          const keys = afterKeys.filter(k => !isTimestamp(k));
          // keep only keys that actually changed
          const diffKeys = keys.filter(k => {
            const a = before[k];
            const b = after[k];
            try {
              return JSON.stringify(a) !== JSON.stringify(b);
            } catch (e) {
              return String(a) !== String(b);
            }
          });
        if (diffKeys.length === 0) {
          ctx.changes = 'No changes';
        } else {
          // Resolve id -> name lookups for known fields to present friendly values
          const pool = require('../../db/connection');
          const isIssue = String(event || '').toLowerCase().includes('issue');
          const isDocument = String(event || '').toLowerCase().includes('document');

          const projectIds = [];
          const statusIds = [];
          const typeIds = [];
          const userIds = [];
          const stageIds = [];
          const specIds = [];
          const dirIds = [];

          for (const k of diffKeys) {
            // collect IDs from both before and after so we can resolve old and new values
            const vals = [before[k], after[k]];
            for (const val of vals) {
              if (val === undefined || val === null) continue;
              if (k === 'project_id') projectIds.push(Number(val));
              else if (k === 'status_id') statusIds.push(Number(val));
              else if (k === 'type_id') typeIds.push(Number(val));
              else if (k === 'assignee_id' || k === 'assigne_to' || k === 'author_id' || k === 'created_by') userIds.push(Number(val));
              else if (k === 'stage_id') stageIds.push(Number(val));
              else if (k === 'specialization_id') specIds.push(Number(val));
              else if (k === 'directory_id') dirIds.push(Number(val));
            }
          }

          const queries = [];
          queries.push(projectIds.length ? pool.query('SELECT id, name, code FROM projects WHERE id = ANY($1::int[])', [projectIds]) : Promise.resolve({ rows: [] }));
          // status table depends on event context
          if (statusIds.length) {
            const tbl = isIssue ? 'issue_status' : (isDocument ? 'document_status' : 'issue_status');
            queries.push(pool.query(`SELECT id, name, code FROM ${tbl} WHERE id = ANY($1::int[])`, [statusIds]));
          } else queries.push(Promise.resolve({ rows: [] }));
          if (typeIds.length) {
            const ttable = isIssue ? 'issue_type' : (isDocument ? 'document_type' : 'issue_type');
            queries.push(pool.query(`SELECT id, name, code FROM ${ttable} WHERE id = ANY($1::int[])`, [typeIds]));
          } else queries.push(Promise.resolve({ rows: [] }));
          queries.push(userIds.length ? pool.query('SELECT id, username, first_name, last_name, middle_name, email FROM users WHERE id = ANY($1::int[])', [userIds]) : Promise.resolve({ rows: [] }));
          queries.push(stageIds.length ? pool.query('SELECT id, name, end_date FROM stages WHERE id = ANY($1::int[])', [stageIds]) : Promise.resolve({ rows: [] }));
          queries.push(specIds.length ? pool.query('SELECT id, name FROM specializations WHERE id = ANY($1::int[])', [specIds]) : Promise.resolve({ rows: [] }));
          queries.push(dirIds.length ? pool.query('SELECT id, name FROM document_directories WHERE id = ANY($1::int[])', [dirIds]) : Promise.resolve({ rows: [] }));

          const [projRes, statusRes, typeRes, usersRes, stagesRes, specsRes, dirsRes] = await Promise.all(queries);

          const projectMap = new Map((projRes.rows || []).map(r => [r.id, r]));
          const statusMap = new Map((statusRes.rows || []).map(r => [r.id, r]));
          const typeMap = new Map((typeRes.rows || []).map(r => [r.id, r]));
          const userMap = new Map((usersRes.rows || []).map(r => [r.id, r]));
          const stageMap = new Map((stagesRes.rows || []).map(r => [r.id, r]));
          const specMap = new Map((specsRes.rows || []).map(r => [r.id, r]));
          const dirMap = new Map((dirsRes.rows || []).map(r => [r.id, r]));

          const mkUserDisplay = (u) => {
            if (!u) return '';
            const parts = [];
            if (u.last_name) parts.push(u.last_name);
            if (u.first_name) parts.push(u.first_name);
            if (u.middle_name) parts.push(u.middle_name);
            const byName = parts.length ? parts.join(' ') : null;
            return byName || u.username || u.email || '';
          };

          const lines = diffKeys.map(k => {
            const a = before[k];
            const b = after[k];
            let pretty = k.replace(/_/g, ' ').replace(/(^|\s)\S/g, s => s.toUpperCase());
            // remove trailing ' Id' for nicer labels (e.g. 'Status Id' -> 'Status')
            pretty = pretty.replace(/\s+Id$/i, '');
            const resolveVal = (key, v, objBefore, objAfter) => {
              // prefer explicit values; if missing, try to resolve via maps; then fall back
              if (v === undefined || v === null || v === '') {
                // try to read enriched display fields from before/after objects
                try {
                  if (key === 'project_id') {
                    return (objBefore && objBefore.project_name) || (objBefore && objBefore.project_code) || (objAfter && objAfter.project_name) || (objAfter && objAfter.project_code) || '';
                  }
                  if (key === 'status_id') {
                    return (objBefore && objBefore.status_name) || (objBefore && objBefore.status_code) || (objAfter && objAfter.status_name) || (objAfter && objAfter.status_code) || '';
                  }
                  if (key === 'type_id') {
                    return (objBefore && objBefore.type_name) || (objBefore && objBefore.type_code) || (objAfter && objAfter.type_name) || (objAfter && objAfter.type_code) || '';
                  }
                  if (key === 'assignee_id' || key === 'assigne_to') {
                    return (objBefore && objBefore.assignee_name) || (objAfter && objAfter.assignee_name) || '';
                  }
                  if (key === 'author_id' || key === 'created_by') {
                    return (objBefore && objBefore.author_name) || (objAfter && objAfter.author_name) || (objBefore && objBefore.created_name) || (objAfter && objAfter.created_name) || '';
                  }
                  if (key === 'stage_id') {
                    return (objBefore && objBefore.stage_name) || (objAfter && objAfter.stage_name) || '';
                  }
                  if (key === 'specialization_id') {
                    return (objBefore && objBefore.specialization_name) || (objAfter && objAfter.specialization_name) || '';
                  }
                  if (key === 'directory_id') {
                    return (objBefore && objBefore.directory_name) || (objAfter && objAfter.directory_name) || '';
                  }
                } catch (e) {
                  // ignore and continue to attempts below
                }
              }
              try {
                if (key === 'project_id') {
                  const p = projectMap.get(Number(v));
                  if (p) return p.name || p.code || String(v);
                }
                if (key === 'status_id') {
                  const s = statusMap.get(Number(v));
                  if (s) return s.name || s.code || String(v);
                }
                if (key === 'type_id') {
                  const t = typeMap.get(Number(v));
                  if (t) return t.name || t.code || String(v);
                }
                if (key === 'assignee_id' || key === 'assigne_to' || key === 'author_id' || key === 'created_by') {
                  const u = userMap.get(Number(v));
                  if (u) return mkUserDisplay(u) || String(v);
                }
                if (key === 'stage_id') {
                  const s = stageMap.get(Number(v));
                  if (s) return s.name || String(v);
                }
                if (key === 'specialization_id') {
                  const sp = specMap.get(Number(v));
                  if (sp) return sp.name || String(v);
                }
                if (key === 'directory_id') {
                  const d = dirMap.get(Number(v));
                  if (d) return d.name || String(v);
                }
                // default stringify
                if (typeof v === 'object') return JSON.stringify(v);
                return String(v === undefined || v === null ? '' : v);
              } catch (e) {
                return String(v === undefined || v === null ? '' : v);
              }
            };
            return `${pretty}: ${resolveVal(k, a, before, after)} → ${resolveVal(k, b, before, after)}`;
          });
          ctx.changes = lines.join('\n');
        }
      } catch (e) {
        // on any error, fall back to original behavior (JSON stringification in _renderString)
      }
    }
    const defaults = {
      rocket_chat: {
        text: `{{project.code}}: {{event}}`
      },
      email: {
        subject: `{{event}} in {{project.code}}`,
        text: `Project: {{project.code}}\n\n{{event}}\n\nLink: {{url}}`,
        html: `<p><strong>Project:</strong> {{project.code}}</p><p>{{event}}</p><p><a href="{{url}}">Open in app</a></p>`
      }
    };

    const result = { text: null, html: null, subject: null };

  if (textTpl) result.text = NotificationTemplateService._renderString(textTpl, ctx);
  if (htmlTpl) result.html = NotificationTemplateService._renderString(htmlTpl, ctx);

    if (!result.text && !result.html) {
      // use default fallback for this method
  const def = defaults[method] || {};
  if (def.subject) result.subject = NotificationTemplateService._renderString(def.subject, ctx);
  if (def.text) result.text = NotificationTemplateService._renderString(def.text, ctx);
  if (def.html) result.html = NotificationTemplateService._renderString(def.html, ctx);
    } else {
      // If method is email and we have HTML but no subject, try to synthesize subject from HTML <title> or <h1>
      if (!result.subject && method === 'email') {
        if (result.html) {
          // Try to extract <title> or first <h1>
          const titleMatch = result.html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const h1Match = result.html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const candidate = (titleMatch && titleMatch[1]) || (h1Match && h1Match[1]) || null;
          if (candidate) result.subject = String(candidate).trim().slice(0, 120);
        }
        // If still no subject, try to synthesize from text if present (edge-case)
  if (!result.subject && result.text) {
          const firstLine = result.text.split('\n')[0] || '';
          result.subject = firstLine.length > 0 ? firstLine.slice(0, 120) : `Notification: ${event}`;
        }
        if (!result.subject) result.subject = `Notification: ${event}`;
      } else if (!result.subject && method === 'email' && result.text) {
        // fallback: if somehow text exists for email, keep previous behavior
        const firstLine = result.text.split('\n')[0] || '';
        result.subject = firstLine.length > 0 ? firstLine.slice(0, 120) : `Notification: ${event}`;
      }
    }

    return result;
  }
}

module.exports = NotificationTemplateService;
