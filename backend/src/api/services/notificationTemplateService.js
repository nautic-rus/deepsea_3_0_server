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
