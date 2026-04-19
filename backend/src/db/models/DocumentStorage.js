const pool = require('../connection');

class DocumentStorage {
  static async attach({ document_id, storage_id }) {
    // Accept optional metadata: type_id, rev, user_id, archive, archive_data, status_id, reason_id, comment
    const q = `INSERT INTO documents_storage (document_id, storage_id, type_id, rev, user_id, archive, archive_data, reason_id, comment, status_edit_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NULL)
      ON CONFLICT (document_id, storage_id) DO UPDATE SET
        type_id = EXCLUDED.type_id,
        rev = EXCLUDED.rev,
        user_id = EXCLUDED.user_id,
        archive = EXCLUDED.archive,
        archive_data = EXCLUDED.archive_data,
        reason_id = EXCLUDED.reason_id,
        comment = EXCLUDED.comment
      RETURNING id, document_id, storage_id, type_id, rev, user_id, archive, archive_data, status_id, reason_id, comment, status_edit_date, created_at`;

    const params = [
      document_id,
      storage_id,
      typeof arguments[0].type_id !== 'undefined' ? arguments[0].type_id : null,
      typeof arguments[0].rev !== 'undefined' ? arguments[0].rev : null,
      typeof arguments[0].user_id !== 'undefined' ? arguments[0].user_id : null,
      typeof arguments[0].archive !== 'undefined' ? arguments[0].archive : false,
      typeof arguments[0].archive_data !== 'undefined' ? arguments[0].archive_data : null,
      typeof arguments[0].reason_id !== 'undefined' ? arguments[0].reason_id : null,
      typeof arguments[0].comment !== 'undefined' ? arguments[0].comment : null
    ];

    const res = await pool.query(q, params);
    return res.rows[0] || null;
  }

  static async detach({ document_id, storage_id }) {
    const q = `DELETE FROM documents_storage WHERE document_id = $1 AND storage_id = $2 RETURNING id, document_id, storage_id`;
    const res = await pool.query(q, [document_id, storage_id]);
    return res.rows[0] || null;
  }

  static async listByDocument(documentId, { limit, offset = 0, status_id, reason_id, comment } = {}) {
    let q = `SELECT s.id AS id, s.document_id, s.storage_id, s.type_id, s.rev, s.user_id, s.archive, s.archive_data, s.status_id, s.reason_id, s.comment, s.status_edit_date,
        st.bucket_name, st.object_key, st.storage_type, st.uploaded_by, st.created_at AS storage_created_at,
        st.file_name, st.file_size, st.mime_type,
        dst.name AS type_name,
        ss.id AS status_id, ss.code AS status_code, ss.name AS status_name, ss.description AS status_description, ss.is_active AS status_is_active, ss.created_at AS status_created_at,
        sr.id AS reason_id, sr.code AS reason_code, sr.name AS reason_name, sr.description AS reason_description, sr.is_active AS reason_is_active, sr.created_at AS reason_created_at,
        u.username AS user_username, u.first_name AS user_first_name, u.last_name AS user_last_name, u.middle_name AS user_middle_name, u.email AS user_email, u.avatar_id AS user_avatar_id
      FROM documents_storage s
      JOIN storage st ON st.id = s.storage_id
      LEFT JOIN documents_storage_type dst ON dst.id = s.type_id
      LEFT JOIN documents_storage_statuses ss ON ss.id = s.status_id
      LEFT JOIN documents_storage_reasons sr ON sr.id = s.reason_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.document_id = $1`;
    const params = [documentId];
    let idx = 2;

    if (typeof status_id !== 'undefined' && status_id !== null && !Number.isNaN(Number(status_id))) {
      q += ` AND s.status_id = $${idx++}`;
      params.push(Number(status_id));
    }

    if (typeof reason_id !== 'undefined' && reason_id !== null && !Number.isNaN(Number(reason_id))) {
      q += ` AND s.reason_id = $${idx++}`;
      params.push(Number(reason_id));
    }

    if (typeof comment !== 'undefined' && comment !== null && String(comment).trim() !== '') {
      q += ` AND s.comment ILIKE $${idx++}`;
      params.push(`%${String(comment).trim()}%`);
    }

    q += ` ORDER BY s.id DESC`;

    if (limit != null) {
      params.push(limit, offset);
      q += ` LIMIT $${idx++} OFFSET $${idx++}`;
    } else if (offset) {
      params.push(offset);
      q += ` OFFSET $${idx++}`;
    }
    const res = await pool.query(q, params);
    return res.rows;
  }

  // Update metadata for an attached storage entry
  static async updateMetadata({ document_id, storage_id, metadata = {} }) {
    const q = `UPDATE documents_storage SET
      type_id = COALESCE($3, type_id),
      rev = COALESCE($4, rev),
      user_id = COALESCE($5, user_id),
      archive = COALESCE($6, archive),
      archive_data = COALESCE($7, archive_data),
      status_id = COALESCE($8, status_id),
      reason_id = COALESCE($9, reason_id),
      comment = COALESCE($10, comment),
        status_edit_date = CASE WHEN $8::int IS NOT NULL AND $8::int IS DISTINCT FROM status_id THEN now() ELSE status_edit_date END
      WHERE document_id = $1 AND storage_id = $2 RETURNING id, document_id, storage_id, type_id, rev, user_id, archive, archive_data, status_id, reason_id, comment, status_edit_date`;

    const params = [
      document_id,
      storage_id,
      typeof metadata.type_id !== 'undefined' ? metadata.type_id : null,
      typeof metadata.rev !== 'undefined' ? metadata.rev : null,
      typeof metadata.user_id !== 'undefined' ? metadata.user_id : null,
      typeof metadata.archive !== 'undefined' ? metadata.archive : null,
      typeof metadata.archive_data !== 'undefined' ? metadata.archive_data : null,
      typeof metadata.status_id !== 'undefined' ? metadata.status_id : null,
      typeof metadata.reason_id !== 'undefined' ? metadata.reason_id : null,
      typeof metadata.comment !== 'undefined' ? metadata.comment : null
    ];

    const res = await pool.query(q, params);
    return res.rows[0] || null;
  }
}

module.exports = DocumentStorage;
