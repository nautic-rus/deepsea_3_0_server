const pool = require('../connection');

class DocumentUploadNotificationBuffer {
  static async enqueue({ documentId, projectId = null, storageId, actor = null, attachedData = null, storageData = null }) {
    const query = `
      INSERT INTO public.document_upload_notification_buffer (
        document_id,
        project_id,
        storage_id,
        actor_data,
        attached_data,
        storage_data
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
      RETURNING *
    `;

    const params = [
      Number(documentId),
      projectId == null ? null : Number(projectId),
      Number(storageId),
      actor ? JSON.stringify(actor) : null,
      attachedData ? JSON.stringify(attachedData) : null,
      storageData ? JSON.stringify(storageData) : null
    ];

    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  static async claimReadyGroups({ quietPeriodSeconds = 10, processingTimeoutSeconds = 300, limit = 50 } = {}) {
    const query = `
      WITH candidate_documents AS (
        SELECT document_id
        FROM public.document_upload_notification_buffer
        WHERE processing_at IS NULL
           OR processing_at < NOW() - make_interval(secs => $2::int)
        GROUP BY document_id
        HAVING MAX(created_at) <= NOW() - make_interval(secs => $1::int)
        ORDER BY MAX(created_at) ASC
        LIMIT $3
      ),
      claimed AS (
        UPDATE public.document_upload_notification_buffer buffer
        SET processing_at = NOW()
        WHERE buffer.document_id IN (SELECT document_id FROM candidate_documents)
          AND (
            buffer.processing_at IS NULL
            OR buffer.processing_at < NOW() - make_interval(secs => $2::int)
          )
        RETURNING buffer.*
      )
      SELECT *
      FROM claimed
      ORDER BY document_id ASC, created_at ASC, id ASC
    `;

    const res = await pool.query(query, [quietPeriodSeconds, processingTimeoutSeconds, limit]);
    return res.rows || [];
  }

  static async deleteByIds(ids = []) {
    const normalizedIds = [...new Set(ids.map(Number).filter((id) => !Number.isNaN(id)))];
    if (normalizedIds.length === 0) return 0;

    const res = await pool.query(
      'DELETE FROM public.document_upload_notification_buffer WHERE id = ANY($1::bigint[])',
      [normalizedIds]
    );
    return res.rowCount || 0;
  }

  static async releaseByIds(ids = []) {
    const normalizedIds = [...new Set(ids.map(Number).filter((id) => !Number.isNaN(id)))];
    if (normalizedIds.length === 0) return 0;

    const res = await pool.query(
      `
        UPDATE public.document_upload_notification_buffer
        SET processing_at = NULL
        WHERE id = ANY($1::bigint[])
      `,
      [normalizedIds]
    );
    return res.rowCount || 0;
  }
}

module.exports = DocumentUploadNotificationBuffer;
