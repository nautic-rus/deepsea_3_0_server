/**
 * Model for notification events (issue_created, comment_added, etc.)
 */

const pool = require('../connection');

class NotificationEvent {
  static async create({ code, name, description = null }) {
    const query = `INSERT INTO public.notification_events (code, name, description) VALUES ($1, $2, $3) RETURNING *`;
    const res = await pool.query(query, [code, name, description]);
    return res.rows[0];
  }

  static async findByCode(code) {
    const query = `SELECT * FROM public.notification_events WHERE code = $1`;
    const res = await pool.query(query, [code]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const query = `SELECT * FROM public.notification_events WHERE id = $1`;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async listAll() {
    const query = `SELECT * FROM public.notification_events ORDER BY id`;
    const res = await pool.query(query);
    return res.rows;
  }
}

module.exports = NotificationEvent;
