/**
 * Конфигурация подключения к базе данных PostgreSQL
 */

const config = {
  development: {
    // Read connection params from environment only. Do not embed repository-specific
    // defaults here to avoid leaking personal values or assuming local setup.
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // By default SSL is disabled unless explicitly set via DB_SSL env var.
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20, // максимальное количество клиентов в пуле
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  production: {
    // Production must provide all sensitive connection parameters via environment.
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

// Получаем текущее окружение
const env = process.env.NODE_ENV;

// Экспортируем конфиг для текущего окружения
module.exports = config[env];

