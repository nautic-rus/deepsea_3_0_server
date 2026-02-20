const pool = require('../connection');

class DocumentStorage {
  static async attach({ document_id, storage_id }) {
    // Accept optional metadata: type_id, rev, user_id, archive, archive_data
    const q = `INSERT INTO documents_storage (document_id, storage_id, type_id, rev, user_id, archive, archive_data)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (document_id, storage_id) DO UPDATE SET
        type_id = EXCLUDED.type_id,
        rev = EXCLUDED.rev,
        user_id = EXCLUDED.user_id,
        archive = EXCLUDED.archive,
        archive_data = EXCLUDED.archive_data
      RETURNING id, document_id, storage_id, type_id, rev, user_id, archive, archive_data, created_at`;

    const params = [
      document_id,
      storage_id,
      typeof arguments[0].type_id !== 'undefined' ? arguments[0].type_id : null,
      typeof arguments[0].rev !== 'undefined' ? arguments[0].rev : null,
      typeof arguments[0].user_id !== 'undefined' ? arguments[0].user_id : null,
      typeof arguments[0].archive !== 'undefined' ? arguments[0].archive : false,
      typeof arguments[0].archive_data !== 'undefined' ? arguments[0].archive_data : null
    ];

    const res = await pool.query(q, params);
    return res.rows[0] || null;
  }

  static async detach({ document_id, storage_id }) {
    const q = `DELETE FROM documents_storage WHERE document_id = $1 AND storage_id = $2 RETURNING id, document_id, storage_id`;
    const res = await pool.query(q, [document_id, storage_id]);
    return res.rows[0] || null;
  }

  static async listByDocument(documentId, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT s.id AS id, s.document_id, s.storage_id, s.type_id, s.rev, s.user_id, s.archive, s.archive_data,
        st.bucket_name, st.object_key, st.storage_type, st.uploaded_by, st.created_at AS storage_created_at,
        st.file_name, st.file_size, st.mime_type,
        dst.name AS type_name,
        u.username AS user_username, u.first_name AS user_first_name, u.last_name AS user_last_name, u.middle_name AS user_middle_name, u.email AS user_email, u.avatar_id AS user_avatar_id
      FROM documents_storage s
      JOIN storage st ON st.id = s.storage_id
      LEFT JOIN documents_storage_type dst ON dst.id = s.type_id
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.document_id = $1
      ORDER BY s.id DESC
      LIMIT $2 OFFSET $3`;
    const res = await pool.query(q, [documentId, limit, offset]);
    return res.rows;
  }

  // Update metadata for an attached storage entry
  static async updateMetadata({ document_id, storage_id, metadata = {} }) {
    const q = `UPDATE documents_storage SET
      type_id = COALESCE($3, type_id),
      rev = COALESCE($4, rev),
      user_id = COALESCE($5, user_id),
      archive = COALESCE($6, archive),
      archive_data = COALESCE($7, archive_data)
      WHERE document_id = $1 AND storage_id = $2 RETURNING id, document_id, storage_id, type_id, rev, user_id, archive, archive_data`;

    const params = [
      document_id,
      storage_id,
      typeof metadata.type_id !== 'undefined' ? metadata.type_id : null,
      typeof metadata.rev !== 'undefined' ? metadata.rev : null,
      typeof metadata.user_id !== 'undefined' ? metadata.user_id : null,
      typeof metadata.archive !== 'undefined' ? metadata.archive : null,
      typeof metadata.archive_data !== 'undefined' ? metadata.archive_data : null
    ];

    const res = await pool.query(q, params);
    return res.rows[0] || null;
  }
}

module.exports = DocumentStorage;
