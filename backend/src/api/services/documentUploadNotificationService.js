const pool = require('../../db/connection');
const Document = require('../../db/models/Document');
const Project = require('../../db/models/Project');
const DocumentUploadNotificationBuffer = require('../../db/models/DocumentUploadNotificationBuffer');
const NotificationDispatcher = require('./notificationDispatcher');

class DocumentUploadNotificationService {
  static async queueUploads({ document, actor, attachedEntries = [], storageItems = [] }) {
    if (!document || !document.id) return;
    if (!Array.isArray(attachedEntries) || attachedEntries.length === 0) return;

    const storageById = new Map(
      (storageItems || [])
        .filter((item) => item && item.id)
        .map((item) => [Number(item.id), item])
    );

    for (const attachedEntry of attachedEntries) {
      if (!attachedEntry || !attachedEntry.storage_id) continue;
      const storageItem = storageById.get(Number(attachedEntry.storage_id)) || null;

      await DocumentUploadNotificationBuffer.enqueue({
        documentId: document.id,
        projectId: document.project_id,
        storageId: attachedEntry.storage_id,
        actor,
        attachedData: attachedEntry,
        storageData: storageItem
      });
    }
  }

  static async flushReadyGroups({ quietPeriodSeconds = 10, processingTimeoutSeconds = 300, limit = 50 } = {}) {
    const rows = await DocumentUploadNotificationBuffer.claimReadyGroups({
      quietPeriodSeconds,
      processingTimeoutSeconds,
      limit
    });
    if (!rows.length) return { processedGroups: 0, processedRows: 0 };

    const groups = DocumentUploadNotificationService._groupRowsByDocument(rows);
    let processedGroups = 0;
    let processedRows = 0;

    for (const group of groups) {
      const ids = group.rows.map((row) => Number(row.id)).filter((id) => !Number.isNaN(id));
      try {
        await DocumentUploadNotificationService._dispatchGroup(group);
        await DocumentUploadNotificationBuffer.deleteByIds(ids);
        processedGroups += 1;
        processedRows += ids.length;
      } catch (error) {
        await DocumentUploadNotificationBuffer.releaseByIds(ids);
        throw error;
      }
    }

    return { processedGroups, processedRows };
  }

  static _groupRowsByDocument(rows) {
    const grouped = new Map();

    for (const row of rows) {
      const documentId = Number(row.document_id);
      if (!grouped.has(documentId)) {
        grouped.set(documentId, { documentId, rows: [] });
      }
      grouped.get(documentId).rows.push(row);
    }

    return [...grouped.values()];
  }

  static async _dispatchGroup(group) {
    const documentId = Number(group.documentId);
    if (Number.isNaN(documentId)) return;

    const document = await Document.findById(documentId);
    if (!document || document.is_active === false) return;

    const latestRow = group.rows[group.rows.length - 1] || null;
    const actor = DocumentUploadNotificationService._normalizeActor(latestRow && latestRow.actor_data);
    const storageItems = DocumentUploadNotificationService._collectUniqueByStorageId(group.rows, 'storage_data');
    const attachedEntries = DocumentUploadNotificationService._collectUniqueByStorageId(group.rows, 'attached_data');
    if (!storageItems.length || !attachedEntries.length) return;

    let project = null;
    try {
      project = await Project.findById(Number(document.project_id));
    } catch (error) {
      project = null;
    }

    const frontendRoot = process.env.FRONTEND_URL || '';
    const documentUrl = frontendRoot ? `${frontendRoot.replace(/\/$/, '')}/documents/${document.id}` : '';
    const storageItem = storageItems[0] || null;
    const storageFileList = storageItems
      .map((item) => item && item.file_name)
      .filter(Boolean)
      .join('\n');
    const projectParticipantsRes = await pool.query(
      'SELECT DISTINCT user_id FROM user_roles WHERE project_id = $1',
      [document.project_id]
    );
    const projectParticipantIds = (projectParticipantsRes.rows || [])
      .map((row) => Number(row.user_id))
      .filter(Boolean);
    const templateContext = {
      project: { id: document.project_id, code: (project && project.code) || null },
      document,
      actor,
      documentUrl,
      storage_items: storageItems,
      storage_item: storageItem,
      storage_file_list: storageFileList,
      storage_items_count: storageItems.length
    };
    const contentValue = attachedEntries.length === 1 ? attachedEntries[0] : attachedEntries;
    const fallbackSuffix = storageItems.length > 1 ? ` (${storageItems.length} files)` : '';

    await NotificationDispatcher.dispatchAsync({
      eventCode: 'document_uploaded',
      projectId: document.project_id,
      actor,
      entity: { id: document.id, code: 'document', title: document.title },
      content: { value: contentValue },
      participantIds: [document.created_by, document.assigne_to],
      templateContext,
      fallbackText: `Document uploaded: ${document.title}${fallbackSuffix}`,
      fallbackSubject: `Document uploaded ${document.title}${fallbackSuffix}`
    });

    await NotificationDispatcher.dispatchAsync({
      eventCode: 'document_uploaded_in_project',
      projectId: document.project_id,
      actor,
      entity: { id: document.id, code: 'document', title: document.title },
      content: { value: contentValue },
      participantIds: projectParticipantIds,
      templateContext,
      fallbackText: `Document uploaded: ${document.title}${fallbackSuffix}`,
      fallbackSubject: `Document uploaded ${document.title}${fallbackSuffix}`
    });
  }

  static _normalizeActor(actorData) {
    if (!actorData || typeof actorData !== 'object') return { id: null };
    return {
      id: actorData.id || null,
      username: actorData.username || null,
      email: actorData.email || null,
      first_name: actorData.first_name || null,
      last_name: actorData.last_name || null,
      middle_name: actorData.middle_name || null,
      avatar_id: actorData.avatar_id || null,
      full_name: actorData.full_name || null
    };
  }

  static _collectUniqueByStorageId(rows, fieldName) {
    const values = new Map();

    for (const row of rows) {
      const storageId = Number(row.storage_id);
      if (Number.isNaN(storageId)) continue;
      const payload = row[fieldName];
      if (!payload || typeof payload !== 'object') continue;
      if (!values.has(storageId)) values.set(storageId, payload);
    }

    return [...values.values()];
  }
}

module.exports = DocumentUploadNotificationService;
