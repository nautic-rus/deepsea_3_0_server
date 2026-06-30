const app = require('./app');
const config = require('./config');
const pool = require('./db');

async function start() {
  await pool.query('SELECT 1');
  app.listen(config.port, () => {
    console.log(`DeepSea chat service started on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start chat service', error);
  process.exit(1);
});
