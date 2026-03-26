const pool = require('../connection');

/**
 * CustomerQuestionHistory data access object for schema `customer_question_history`.
 */
class CustomerQuestionHistory {
  static async create(fields) {
    const questionId = fields.question_id || fields.questionId || null;
    const actorId = fields.actor_id || fields.changed_by || null;
    const action = fields.action || null; // maps to field_name
    let oldValue = null;
    let newValue = null;
    if (fields.details !== undefined && fields.details !== null) {
      if (typeof fields.details === 'object' && (fields.details.before !== undefined || fields.details.after !== undefined)) {
        if (fields.details.before !== undefined && fields.details.before !== null) oldValue = typeof fields.details.before === 'string' ? fields.details.before : JSON.stringify(fields.details.before);
        if (fields.details.after !== undefined && fields.details.after !== null) newValue = typeof fields.details.after === 'string' ? fields.details.after : JSON.stringify(fields.details.after);
      } else {
        newValue = typeof fields.details === 'string' ? fields.details : JSON.stringify(fields.details);
      }
    }

    const q = `INSERT INTO customer_question_history (question_id, field_name, old_value, new_value, changed_by) VALUES ($1,$2,$3,$4,$5) RETURNING id, question_id, field_name, old_value, new_value, changed_by, created_at`;
    const vals = [questionId, action, oldValue, newValue, actorId];
    const res = await pool.query(q, vals);
    return res.rows[0];
  }

  /** List history entries for given question id. */
  static async listByQuestion(questionId) {
    const q = `SELECT id, question_id, field_name, old_value, new_value, changed_by, created_at FROM customer_question_history WHERE question_id = $1 ORDER BY created_at ASC`;
    const res = await pool.query(q, [questionId]);
    return res.rows;
  }
}

module.exports = CustomerQuestionHistory;
