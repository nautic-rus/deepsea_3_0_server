/**
 * Centralized notification dispatcher.
 *
 * Handles the full lifecycle: get recipients → filter by participants →
 * create one user_notifications record per user → send via Rocket.Chat / email.
 *
 * Usage from any service:
 *   const NotificationDispatcher = require('./notificationDispatcher');
 *   NotificationDispatcher.dispatch({ ... });
 */

const UserNotification = require('../../db/models/UserNotification');
const { buildNotificationData, resolveFieldNames } = require('../../db/models/UserNotification');
const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
const User = require('../../db/models/User');
const TemplateService = require('./notificationTemplateService');
const EmailService = require('./emailService');
const RocketChatService = require('./rocketChatService');

class NotificationDispatcher {
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
   * @param {number[]} [opts.directUserIds] - user IDs that always get a center notification (even if not subscribed)
   */
  static dispatch(opts) {
    // Fire-and-forget: run the heavy work asynchronously
    (async () => {
      try {
        await NotificationDispatcher._doDispatch(opts);
      } catch (err) {
        console.error(`Error dispatching notifications for ${opts.eventCode}:`, err && err.stack ? err.stack : err);
      }
    })();
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
      excludeActor = true,
      directUserIds = []
    } = opts;

    // 1. Get all potential recipients
    const allRecipients = await UserNotificationSetting.getRecipientsForEvent(projectId, eventCode);
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

    // 4. Loop: create DB record (once per user), send via method
    const notifiedUserIds = new Set();

    for (const r of recipients) {
      try {
        const uid = Number(r.user_id);

        // Create center notification (once per user) unless user is inactive
        const isActive = typeof r.is_active !== 'undefined' ? Boolean(r.is_active) : true;
        if (!notifiedUserIds.has(uid)) {
          // mark as handled to avoid duplicate attempts (even if inactive)
          notifiedUserIds.add(uid);
          if (isActive) {
            try {
              UserNotification.create({
                user_id: uid,
                event_code: eventCode,
                project_id: projectId,
                data: notifData
              }).catch(e => console.error('Failed to create user notification', e && e.message ? e.message : e));
            } catch (e) {
              console.error('Failed to queue user notification', e && e.message ? e.message : e);
            }
          }
        }

        // Deliver via channel (skip external channels for inactive users)
        if (r.method_code === 'rocket_chat') {
          if (!isActive) {
            // skip sending to inactive user's Rocket.Chat
            continue;
          }
          const rendered = await TemplateService.render(eventCode, 'rocket_chat', templateContext);
          const text = rendered.text || rendered.html || fallbackText;
          if (r.rc_username) {
            await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text });
          } else if (r.rc_user_id) {
            await RocketChatService.sendMessage({ channel: r.rc_user_id, text });
          }
        } else if (r.method_code === 'email') {
          if (!isActive) {
            // skip sending email to inactive user
            continue;
          }
          const rendered = await TemplateService.render(eventCode, 'email', templateContext);
          const subject = rendered.subject || fallbackSubject || `Notification: ${eventCode}`;
          try {
            await EmailService.sendMail({ to: r.email, subject, text: rendered.text, html: rendered.html });
          } catch (mailErr) {
            console.error('Failed to send email to', r.email, mailErr && mailErr.message ? mailErr.message : mailErr);
          }
        }
      } catch (err) {
        console.error('Failed to send notification to user', r.user_id, err && err.message ? err.message : err);
      }
    }

    // Ensure center notifications for directUserIds (e.g. assignee) even if they weren't subscribed
    if (directUserIds && directUserIds.length > 0) {
      for (const uid of directUserIds) {
        const numUid = Number(uid);
        if (uid && !notifiedUserIds.has(numUid)) {
          // check if user is active before creating center notification
          try {
            const user = await User.findById(numUid);
            notifiedUserIds.add(numUid);
            if (user && user.is_active) {
              UserNotification.create({
                user_id: numUid,
                event_code: eventCode,
                project_id: projectId,
                data: notifData
              }).catch(e => console.error('Failed to create direct user notification', e && e.message ? e.message : e));
            }
          } catch (e) {
            console.error('Failed to check/create direct user notification for', numUid, e && e.message ? e.message : e);
          }
        }
      }
    }
  }
}

module.exports = NotificationDispatcher;
