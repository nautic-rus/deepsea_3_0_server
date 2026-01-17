const pool = require('../src/db/connection');

(async () => {
  try {
    const res = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name='user_rocket_chat'");
    console.log('FOUND:', res.rows);
  } catch (e) {
    console.error('ERROR', e.stack || e);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch (__) {}
  }
})();
