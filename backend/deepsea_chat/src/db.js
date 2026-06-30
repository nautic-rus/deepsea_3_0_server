const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  ...config.db,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (error) => {
  console.error('Chat DB pool error', error);
});

module.exports = pool;
