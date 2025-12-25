/**
 * Модель для работы с наименованиями должностей
 */
const pool = require('../connection');

class JobTitle {
  static async findNameById(id) {
    if (!id) return null;
    const res = await pool.query('SELECT name FROM job_title WHERE id = $1', [id]);
    return res.rows[0] ? res.rows[0].name : null;
  }

  static async list() {
    const res = await pool.query('SELECT id, name FROM job_title ORDER BY id ASC');
    return res.rows;
  }
}

module.exports = JobTitle;
