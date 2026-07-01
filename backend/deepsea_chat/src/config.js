require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 3100),
  authServiceUrl: String(process.env.AUTH_SERVICE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  serviceName: String(process.env.CHAT_SERVICE_NAME || 'deepsea-chat').trim() || 'deepsea-chat',
  internalToken: String(process.env.CHAT_INTERNAL_TOKEN || '').trim(),
  adminUserIds: String(process.env.CHAT_ADMIN_USER_IDS || '')
    .split(',')
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isInteger(value) && value > 0),
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  }
};
