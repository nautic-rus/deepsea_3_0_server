/**
 * Конфигурация подключения к PostgreSQL старой системы
 * Используется миграционными скриптами в директории `migratons_deepsea_2`.
 *
 * Переменные окружения (рекомендуется задавать в .env для миграций):
 *  - OLD_DB_HOST
 *  - OLD_DB_PORT
 *  - OLD_DB_NAME
 *  - OLD_DB_USER
 *  - OLD_DB_PASSWORD
 *  - OLD_DB_SSL  (set to 'true' to enable SSL)
 *  - MIGRATIONS_ENV or NODE_ENV (optional, defaults to 'development')
 */

const config = {
  development: {
    host: process.env.OLD_DB_HOST ,
    port: process.env.OLD_DB_PORT ,
    database: process.env.OLD_DB_NAME ,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    ssl: process.env.OLD_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  production: {
    host: process.env.OLD_DB_HOST,
    port: process.env.OLD_DB_PORT ? Number(process.env.OLD_DB_PORT) : undefined,
    database: process.env.OLD_DB_NAME,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    ssl: process.env.OLD_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

const env = process.env.MIGRATIONS_ENV || process.env.NODE_ENV || 'development';

module.exports = config[env];
