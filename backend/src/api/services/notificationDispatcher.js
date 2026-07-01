/**
 * Centralized notification dispatcher.
 *
 * Handles the full lifecycle: get recipients → filter by participants →
 * process enabled notification methods (notifications_bar / Rocket.Chat / deepsea_chat / email).
 *
 * Usage from any service:
 *   const NotificationDispatcher = require('./notificationDispatcher');
 *   NotificationDispatcher.dispatch({ ... });
 */

const UserNotification = require('../../db/models/UserNotification');
const { buildNotificationData, resolveFieldNames } = require('../../db/models/UserNotification');
const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
const NotificationEvent = require('../../db/models/NotificationEvent');
const { hasPermission } = require('./permissionChecker');
const TemplateService = require('./notificationTemplateService');
const EmailService = require('./emailService');
const RocketChatService = require('./rocketChatService');

const DEEPSEA_CHAT_URL = String(process.env.DEEPSEA_CHAT_URL || process.env.CHAT_SERVICE_URL || '').replace(/\/$/, '');
const DEEPSEA_CHAT_INTERNAL_TOKEN = String(process.env.DEEPSEA_CHAT_INTERNAL_TOKEN || process.env.CHAT_INTERNAL_TOKEN || '').trim();

class NotificationDispatcher {
  static EXTERNAL_DUPLICATE_WINDOW_MS = 60 * 1000;

  static EXTERNAL_EVENT_GROUPS = {
    document_uploaded: 'document_uploaded_group',
    document_uploaded_in_project: 'document_uploaded_group',
    document_updated: 'document_updated_group',
    document_updated_in_project: 'document_updated_group',
    question_updated: 'question_updated_group',
    question_updated_in_project: 'question_updated_group'
  };

  static _recentExternalDeliveries = new Map();

  static _normalizeMessagePart(value) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/\s+/g, ' ').trim();
  }

  static _stripHtml(value) {
    if (value === undefined || value === null) return '';
    return String(value)
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(p|div|li|tr|ol|ul|h[1-6])\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '- ')
      .replace(/<\s*[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static _reserveExternalDeliveryKey({ eventCode, methodCode, userId, projectId, entityId, target, subject, body }) {
    const normalizedEvent = NotificationDispatcher.EXTERNAL_EVENT_GROUPS[String(eventCode)] || String(eventCode);
    const normalizedMethod = String(methodCode || '').toLowerCase();
    const normalizedTarget = NotificationDispatcher._normalizeMessagePart(target).toLowerCase();
    const normalizedSubject = NotificationDispatcher._normalizeMessagePart(subject);
    const normalizedBody = NotificationDispatcher._normalizeMessagePart(body);
    const key = [
      normalizedEvent,
      normalizedMethod,
      Number(userId) || 0,
      Number(projectId) || 0,
      Number(entityId) || 0,
      normalizedTarget,
      normalizedSubject,
      normalizedBody
    ].join('||');

    const now = Date.now();
    const expiresAt = NotificationDispatcher._recentExternalDeliveries.get(key);
    if (expiresAt && expiresAt > now) return null;

    NotificationDispatcher._recentExternalDeliveries.set(key, now + NotificationDispatcher.EXTERNAL_DUPLICATE_WINDOW_MS);

    // Best-effort cleanup of expired keys to keep the map bounded.
    if (NotificationDispatcher._recentExternalDeliveries.size > 2000) {
      for (const [k, exp] of NotificationDispatcher._recentExternalDeliveries.entries()) {
        if (!exp || exp <= now) NotificationDispatcher._recentExternalDeliveries.delete(k);
      }
    }

    return key;
  }

  static _releaseExternalDeliveryKey(key) {
    if (!key) return;
    NotificationDispatcher._recentExternalDeliveries.delete(key);
  }

  static _hasOwn(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  static _isDocumentEvent(eventCode, entity) {
    const code = String(eventCode || '').toLowerCase();
    const entityCode = entity && entity.code ? String(entity.code).toLowerCase() : '';
    return entityCode === 'document' || code.startsWith('document_') || code === 'comment_added';
  }

  static _shouldFilterBySpecialization(entity) {
    const entityCode = entity && entity.code ? String(entity.code).toLowerCase() : '';
    return entityCode === 'document' || entityCode === 'customer_question';
  }

  static _normalizeSpecializationId(value) {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  static _extractSpecializationId(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'object') {
      if (Object.prototype.hasOwnProperty.call(value, 'id')) {
        return NotificationDispatcher._normalizeSpecializationId(value.id);
      }
      if (Object.prototype.hasOwnProperty.call(value, 'specialization_id')) {
        return NotificationDispatcher._normalizeSpecializationId(value.specialization_id);
      }
    }
    return NotificationDispatcher._normalizeSpecializationId(value);
  }

  static _getSpecializationId({ entity, content, templateContext }) {
    const explicit = NotificationDispatcher._extractSpecializationId(entity && (entity.specialization_id || entity.specialization));
    if (explicit) return explicit;

    const contextEntities = [
      templateContext && templateContext.document,
      templateContext && templateContext.question
    ];
    for (const item of contextEntities) {
      const id = NotificationDispatcher._extractSpecializationId(item && (item.specialization_id || item.specialization));
      if (id) return id;
    }

    const contentEntities = [
      content && content.value,
      content && content.after,
      content && content.before
    ];
    for (const item of contentEntities) {
      const id = NotificationDispatcher._extractSpecializationId(item && (item.specialization_id || item.specialization));
      if (id) return id;
    }

    return null;
  }

  static _getDocumentVisibilityState({ entity, content, templateContext }) {
    const document = templateContext && templateContext.document ? templateContext.document : null;
    const changes = templateContext && templateContext.changes && typeof templateContext.changes === 'object'
      ? templateContext.changes
      : null;

    let publicValue;
    if (document && NotificationDispatcher._hasOwn(document, 'public')) {
      publicValue = document.public;
    } else if (changes && changes.after && NotificationDispatcher._hasOwn(changes.after, 'public')) {
      publicValue = changes.after.public;
    } else if (content && content.value && NotificationDispatcher._hasOwn(content.value, 'public')) {
      publicValue = content.value.public;
    }

    let publicChanged = false;
    if (changes && changes.before && changes.after &&
      NotificationDispatcher._hasOwn(changes.before, 'public') &&
      NotificationDispatcher._hasOwn(changes.after, 'public')) {
      publicChanged = JSON.stringify(changes.before.public) !== JSON.stringify(changes.after.public);
    } else if (content && content.before && content.after &&
      NotificationDispatcher._hasOwn(content.before, 'public') &&
      NotificationDispatcher._hasOwn(content.after, 'public')) {
      publicChanged = JSON.stringify(content.before.public) !== JSON.stringify(content.after.public);
    }

    return {
      isDocumentEvent: NotificationDispatcher._isDocumentEvent(entity && entity.code ? entity.code : null, entity),
      publicValue,
      publicChanged
    };
  }

  static async _canReceiveDocumentNotification(userId, visibilityState, permissionCache) {
    if (!visibilityState || !visibilityState.isDocumentEvent) return true;

    const shouldRestrict = visibilityState.publicValue === false || visibilityState.publicChanged === true;
    if (!shouldRestrict) return true;

    const uid = Number(userId);
    if (!uid) return false;
    if (permissionCache.has(uid)) return permissionCache.get(uid);

    const allowed = await hasPermission({ id: uid }, 'documents.view_not_public');
    permissionCache.set(uid, allowed);
    return allowed;
  }

  static _buildDeepseaChatBody({ rendered, fallbackText, fallbackSubject, eventCode, entity, actor, notifData }) {
    const body = String((rendered && rendered.text) || NotificationDispatcher._stripHtml(rendered && rendered.html) || fallbackText || '').trim();
    const subject = String((rendered && rendered.subject) || fallbackSubject || `Notification: ${eventCode}`).trim();

    return {
      body: body || subject,
      title: subject,
      msgtype: 'm.notice',
      metadata: {
        event_code: eventCode,
        entity: entity || null,
        actor: actor || null,
        notification: notifData || null
      }
    };
  }

  static async _sendDeepseaChatNotification({
    eventCode,
    projectId,
    userId,
    entity,
    actor,
    templateContext,
    fallbackText,
    fallbackSubject,
    notifData,
    rendered = null,
    payloadBody = null
  }) {
    if (!DEEPSEA_CHAT_URL || !DEEPSEA_CHAT_INTERNAL_TOKEN) {
      throw new Error('deepsea_chat notification channel is not configured');
    }

    const effectiveRendered = rendered || await TemplateService.render(eventCode, 'deepsea_chat', templateContext);
    const effectivePayloadBody = payloadBody || NotificationDispatcher._buildDeepseaChatBody({
      rendered: effectiveRendered,
      fallbackText,
      fallbackSubject,
      eventCode,
      entity,
      actor,
      notifData
    });

    const roomKey = `notification:${Number(userId)}`;
    const payload = {
      recipient_user_id: Number(userId),
      room_key: roomKey,
      room_name: 'Deepsea Notificator',
      title: effectivePayloadBody.title,
      body: effectivePayloadBody.body,
      msgtype: effectivePayloadBody.msgtype,
      event_code: eventCode,
      project_id: projectId,
      entity: entity || null,
      actor: actor || null,
      content: notifData && notifData.content ? notifData.content : null,
      metadata: effectivePayloadBody.metadata
    };

    const response = await fetch(`${DEEPSEA_CHAT_URL}/api/internal/bot_notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DeepSea-Internal-Token': DEEPSEA_CHAT_INTERNAL_TOKEN
      },
      body: JSON.stringify(payload)
    });

    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch (err) {
      responseBody = null;
    }

    if (!response.ok) {
      const detail = responseBody && responseBody.error ? responseBody.error : `HTTP ${response.status}`;
      throw new Error(`deepsea_chat notification failed: ${detail}`);
    }

    return responseBody;
  }

  /**
   * Dispatch notifications for an event.
   *
   * @param {object} opts
   * @param {string}   opts.eventCode       - e.g. 'issue_created', 'document_updated'
   * @param {number}   opts.projectId       - project scope (nullable)
   * @param {object}   opts.actor           - user who triggered the event { id, first_name, last_name, avatar_id }
   * @param {object}   opts.entity          - { id, code, title }
   * @param {object}   opts.content         - { value } or { before, after }
   * @param {number[]} opts.participantIds  - user IDs eligible for notification (e.g. author + assignee)
   * @param {object}   opts.templateContext - context object passed to TemplateService.render()
   * @param {string}  [opts.fallbackText]   - fallback text for RC if template renders empty
   * @param {string}  [opts.fallbackSubject]- fallback subject for email if template renders empty
   * @param {boolean} [opts.excludeActor=true] - whether to skip sending to the actor
   */
  static dispatch(opts) {
    // Fire-and-forget: run the heavy work asynchronously
    (async () => {
      try {
        await NotificationDispatcher.dispatchAsync(opts);
      } catch (err) {
        console.error(`Error dispatching notifications for ${opts.eventCode}:`, err && err.stack ? err.stack : err);
      }
    })();
  }

  static async dispatchAsync(opts) {
    await NotificationDispatcher._doDispatch(opts);
  }

  /** Internal: the actual async work */
  static async _doDispatch(opts) {
    const {
      eventCode,
      projectId,
      actor,
      entity,
      content,
      participantIds = [],
      templateContext = {},
      fallbackText = '',
      fallbackSubject = '',
      excludeActor = true
    } = opts;

    // If the event itself is disabled, do not send anything for it.
    const notificationEvent = await NotificationEvent.findByCode(eventCode);
    if (!notificationEvent || notificationEvent.status === false) return;

    // 1. Get all potential recipients
    // Pass through target_user_id if provided in opts so model can special-case project_invite
    const applySpecializationFilter = NotificationDispatcher._shouldFilterBySpecialization(entity);
    const specializationId = applySpecializationFilter
      ? NotificationDispatcher._getSpecializationId({ entity, content, templateContext })
      : null;

    const allRecipients = await UserNotificationSetting.getRecipientsForEvent(projectId, eventCode, {
      target_user_id: opts && (opts.target_user_id || opts.user_id) ? (opts.target_user_id || opts.user_id) : null,
      specialization_id: specializationId,
      apply_specialization_filter: applySpecializationFilter
    });
    if (!allRecipients || allRecipients.length === 0) return;

    // 2. Filter: keep only participants, optionally exclude actor
    const participantSet = new Set(participantIds.filter(Boolean).map(Number));
    const actorId = actor && actor.id ? Number(actor.id) : null;

    const recipients = allRecipients.filter(r => {
      const uid = Number(r.user_id);
      if (participantSet.size > 0 && !participantSet.has(uid)) return false;
      if (excludeActor && actorId && uid === actorId) return false;
      return true;
    });
    if (recipients.length === 0) return;

    const visibilityState = NotificationDispatcher._getDocumentVisibilityState({ entity, content, templateContext });
    const permissionCache = new Map();

    // Special-case: project_invite should ignore user settings and deliver
    // only an email to the target user (no center notification, no Rocket.Chat).
    if (String(eventCode).toLowerCase() === 'project_invite') {
      const uniqueByUser = new Map();
      for (const r of recipients) {
        const uid = Number(r.user_id);
        if (!uid) continue;
        // prefer rows that include an email
        if (!uniqueByUser.has(uid) && r.email) uniqueByUser.set(uid, r);
        else if (!uniqueByUser.has(uid)) uniqueByUser.set(uid, r);
      }

      for (const [uid, r] of uniqueByUser.entries()) {
        try {
          if (!r.email) continue;
          const rendered = await TemplateService.render(eventCode, 'email', templateContext);
          const subject = rendered.subject || fallbackSubject || `Notification: ${eventCode}`;
          try {
            await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html });
          } catch (mailErr) {
            console.error('Failed to send project_invite email to', r.email, mailErr && mailErr.message ? mailErr.message : mailErr);
          }
        } catch (err) {
          console.error('Failed to process project_invite recipient', r.user_id, err && err.message ? err.message : err);
        }
      }

      // Do not proceed with standard dispatch behavior for project_invite
      return;
    }

    const filteredRecipients = [];
    for (const r of recipients) {
      const uid = Number(r.user_id);
      if (!uid) continue;
      if (!(await NotificationDispatcher._canReceiveDocumentNotification(uid, visibilityState, permissionCache))) continue;
      filteredRecipients.push(r);
    }
    if (filteredRecipients.length === 0) return;

    // 3. Build unified notification data once, then resolve FK names
    const notifData = buildNotificationData(actor, entity, content);
    const entityCode = entity && entity.code ? entity.code : null;
    if (entityCode && notifData.content) {
      try {
        notifData.content = await resolveFieldNames(entityCode, notifData.content);
      } catch (e) {
        console.error('Failed to resolve field names for notification', e && e.message ? e.message : e);
      }
    }

    // 4. Loop: handle each enabled method from user_notification_settings.
    const notificationBarUserIds = new Set();

    for (const r of filteredRecipients) {
      try {
        const uid = Number(r.user_id);

        const isActive = typeof r.is_active !== 'undefined' ? Boolean(r.is_active) : true;

        if (r.method_code === 'notifications_bar') {
          if (!isActive) continue;
          if (!notificationBarUserIds.has(uid)) {
            notificationBarUserIds.add(uid);
            UserNotification.create({
              user_id: uid,
              event_code: eventCode,
              project_id: projectId,
              data: notifData
            }).catch(e => console.error('Failed to create user notification', e && e.message ? e.message : e));
          }
        } else if (r.method_code === 'rocket_chat') {
          if (!isActive) {
            // skip sending to inactive user's Rocket.Chat
            continue;
          }
          const rendered = await TemplateService.render(eventCode, 'rocket_chat', templateContext);
          const text = rendered.text || rendered.html || fallbackText;
          const channel = r.rc_username ? `@${r.rc_username}` : (r.rc_user_id || null);
          if (!channel) continue;

          const dedupKey = NotificationDispatcher._reserveExternalDeliveryKey({
            eventCode,
            methodCode: 'rocket_chat',
            userId: uid,
            projectId,
            entityId: entity && entity.id,
            target: channel,
            subject: '',
            body: text
          });
          if (!dedupKey) continue;

          try {
            await RocketChatService.sendMessage({ channel, text });
          } catch (rcErr) {
            NotificationDispatcher._releaseExternalDeliveryKey(dedupKey);
            throw rcErr;
          }
        } else if (r.method_code === 'deepsea_chat') {
          if (!isActive) {
            continue;
          }

          const rendered = await TemplateService.render(eventCode, 'deepsea_chat', templateContext);
          const payloadBody = NotificationDispatcher._buildDeepseaChatBody({
            rendered,
            fallbackText,
            fallbackSubject,
            eventCode,
            entity,
            actor,
            notifData
          });

          const dedupKey = NotificationDispatcher._reserveExternalDeliveryKey({
            eventCode,
            methodCode: 'deepsea_chat',
            userId: uid,
            projectId,
            entityId: entity && entity.id,
            target: `notification:${uid}`,
            subject: payloadBody.title,
            body: payloadBody.body
          });
          if (!dedupKey) continue;

          try {
            await NotificationDispatcher._sendDeepseaChatNotification({
              eventCode,
              projectId,
              userId: uid,
              entity,
              actor,
              templateContext,
              fallbackText,
              fallbackSubject,
              notifData,
              rendered,
              payloadBody
            });
          } catch (chatErr) {
            NotificationDispatcher._releaseExternalDeliveryKey(dedupKey);
            throw chatErr;
          }
        } else if (r.method_code === 'email') {
          if (!isActive) {
            // skip sending email to inactive user
            continue;
          }
          const rendered = await TemplateService.render(eventCode, 'email', templateContext);
          const subject = rendered.subject || fallbackSubject || `Notification: ${eventCode}`;
          const toEmail = r.email ? String(r.email).trim() : '';
          if (!toEmail) continue;

          const dedupKey = NotificationDispatcher._reserveExternalDeliveryKey({
            eventCode,
            methodCode: 'email',
            userId: uid,
            projectId,
            entityId: entity && entity.id,
            target: toEmail,
            subject,
            body: rendered.text || rendered.html || ''
          });
          if (!dedupKey) continue;

          try {
            await EmailService.sendMail({ to: toEmail, subject, text: rendered.text, html: rendered.html });
          } catch (mailErr) {
            NotificationDispatcher._releaseExternalDeliveryKey(dedupKey);
            console.error('Failed to send email to', r.email, mailErr && mailErr.message ? mailErr.message : mailErr);
          }
        }
      } catch (err) {
        console.error('Failed to send notification to user', r.user_id, err && err.message ? err.message : err);
      }
    }
  }
}

module.exports = NotificationDispatcher;
