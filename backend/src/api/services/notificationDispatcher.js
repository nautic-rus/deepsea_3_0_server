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
const { buildNotificationData } = require('../../db/models/UserNotification');
const UserNotificationSetting = require('../../db/models/UserNotificationSetting');
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

    // 3. Build unified notification data once
    const notifData = buildNotificationData(actor, entity, content);

    // 4. Loop: create DB record (once per user), send via method
    const notifiedUserIds = new Set();

    for (const r of recipients) {
      try {
        const uid = Number(r.user_id);

        // Create center notification (once per user)
        if (!notifiedUserIds.has(uid)) {
          notifiedUserIds.add(uid);
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

        // Deliver via channel
        if (r.method_code === 'rocket_chat') {
          const rendered = await TemplateService.render(eventCode, 'rocket_chat', templateContext);
          const text = rendered.text || rendered.html || fallbackText;
          if (r.rc_username) {
            await RocketChatService.sendMessage({ channel: `@${r.rc_username}`, text });
          } else if (r.rc_user_id) {
            await RocketChatService.sendMessage({ channel: r.rc_user_id, text });
          }
        } else if (r.method_code === 'email') {
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
          notifiedUserIds.add(numUid);
          UserNotification.create({
            user_id: numUid,
            event_code: eventCode,
            project_id: projectId,
            data: notifData
          }).catch(e => console.error('Failed to create direct user notification', e && e.message ? e.message : e));
        }
      }
    }
  }
}

module.exports = NotificationDispatcher;
