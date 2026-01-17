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
    // Try filesystem templates first
    const textTpl = await NotificationTemplateService._loadTemplateFile(event, method, 'txt');
    const htmlTpl = await NotificationTemplateService._loadTemplateFile(event, method, 'html');

    // Defaults
    const defaults = {
      rocket_chat: {
        text: `{{project.name}}: New issue #{{issue.id}} - {{issue.title}}\n{{issue.description}}\n{{issueUrl}}`
      },
      email: {
        subject: `New issue #{{issue.id}} in {{project.name}}: {{issue.title}}`,
        text: `Project: {{project.name}}\nIssue: #{{issue.id}} - {{issue.title}}\n\n{{issue.description}}\n\nLink: {{issueUrl}}`,
        html: `<p><strong>Project:</strong> {{project.name}}</p><p><strong>Issue:</strong> #{{issue.id}} - {{issue.title}}</p><p>{{issue.description}}</p><p><a href="{{issueUrl}}">Open in app</a></p>`
      }
    };

    const result = { text: null, html: null, subject: null };

    if (textTpl) result.text = NotificationTemplateService._renderString(textTpl, context);
    if (htmlTpl) result.html = NotificationTemplateService._renderString(htmlTpl, context);

    if (!result.text && !result.html) {
      // use default fallback for this method
      const def = defaults[method] || {};
      if (def.subject) result.subject = NotificationTemplateService._renderString(def.subject, context);
      if (def.text) result.text = NotificationTemplateService._renderString(def.text, context);
      if (def.html) result.html = NotificationTemplateService._renderString(def.html, context);
    } else {
      // If we have text but no subject and method is email, try to synthesize subject from text
      if (!result.subject && method === 'email' && result.text) {
        // first line or truncated
        const firstLine = result.text.split('\n')[0] || '';
        result.subject = firstLine.length > 0 ? firstLine.slice(0, 120) : `Notification: ${event}`;
      }
    }

    return result;
  }
}

module.exports = NotificationTemplateService;
