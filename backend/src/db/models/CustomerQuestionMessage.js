const pool = require('../connection');

class CustomerQuestionMessage {
  /**
   * Create a new message attached to a customer question
   * @param {{customer_question_id:number,user_id:number,content:string, parent_id:number|null}} payload
   */
  static async create({ customer_question_id, user_id, content, parent_id = null }) {
    const q = `INSERT INTO customer_question_messages (customer_question_id, user_id, content, parent_id) VALUES ($1,$2,$3,$4) RETURNING id, customer_question_id, user_id, content, parent_id, created_at`;
    const res = await pool.query(q, [customer_question_id, user_id, content, parent_id || null]);
    return res.rows[0];
  }

  static async listByQuestion(questionId, { limit = 100, offset = 0 } = {}) {
    const q = `SELECT id, customer_question_id, user_id, content, parent_id, created_at FROM customer_question_messages WHERE customer_question_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
    const res = await pool.query(q, [questionId, limit, offset]);
    return res.rows;
  }
}

module.exports = CustomerQuestionMessage;
