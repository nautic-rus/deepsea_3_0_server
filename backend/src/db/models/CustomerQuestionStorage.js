const pool = require('../connection');

class CustomerQuestionStorage {
  static async attach({ customer_question_id, storage_id }) {
    const q = `INSERT INTO customer_questions_storage (customer_question_id, storage_id) VALUES ($1,$2) ON CONFLICT (customer_question_id, storage_id) DO NOTHING RETURNING id, customer_question_id, storage_id, created_at`;
    const res = await pool.query(q, [customer_question_id, storage_id]);
    return res.rows[0] || null;
  }

  static async detach({ customer_question_id, storage_id }) {
    const q = `DELETE FROM customer_questions_storage WHERE customer_question_id = $1 AND storage_id = $2 RETURNING id`;
    const res = await pool.query(q, [customer_question_id, storage_id]);
    return res.rows[0] || null;
  }

  static async listByQuestion(questionId, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT s.storage_id AS storage_id, st.bucket_name, st.object_key, st.file_name, st.file_size, st.mime_type, st.storage_type, st.uploaded_by, st.created_at FROM customer_questions_storage s JOIN storage st ON st.id = s.storage_id WHERE s.customer_question_id = $1 ORDER BY s.id DESC LIMIT $2 OFFSET $3`;
    const res = await pool.query(q, [questionId, limit, offset]);
    return res.rows;
  }
}

module.exports = CustomerQuestionStorage;
