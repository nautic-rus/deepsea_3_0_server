const definitions = [
  { key: 'NODE_ENV', valueType: 'string', defaultValue: 'development', description: 'Режим запуска приложения', isSecret: false, requiresRestart: true },
  { key: 'PORT', valueType: 'number', defaultValue: 3000, description: 'Порт HTTP-сервера', isSecret: false, requiresRestart: true },
  { key: 'HOST', valueType: 'string', defaultValue: 'localhost', description: 'Адрес привязки HTTP-сервера', isSecret: false, requiresRestart: true },
  { key: 'ADMIN_KEY', valueType: 'string', defaultValue: '', description: 'Ключ для технических admin endpoints', isSecret: true, requiresRestart: false },
  { key: 'LOG_DIR', valueType: 'string', defaultValue: '', description: 'Каталог файлов логов', isSecret: false, requiresRestart: true },
  { key: 'JWT_SECRET', valueType: 'string', defaultValue: 'your-secret-key-change-in-production', description: 'Секрет подписи access JWT', isSecret: true, requiresRestart: false },
  { key: 'JWT_REFRESH_SECRET', valueType: 'string', defaultValue: 'your-refresh-secret-key-change-in-production', description: 'Секрет подписи refresh JWT', isSecret: true, requiresRestart: false },
  { key: 'JWT_EXPIRES_IN', valueType: 'string', defaultValue: '24h', description: 'TTL access токена', isSecret: false, requiresRestart: false },
  { key: 'REFRESH_TOKEN_EXPIRES_IN', valueType: 'string', defaultValue: '7d', description: 'TTL refresh токена', isSecret: false, requiresRestart: false },
  { key: 'SESSION_DEACTIVATE_ON_EXPIRE', valueType: 'boolean', defaultValue: false, description: 'Деактивировать ли access-сессию при истечении срока', isSecret: false, requiresRestart: false },
  { key: 'PASSWORD_RESET_EXPIRES_MINUTES', valueType: 'number', defaultValue: 60, description: 'Срок жизни токена сброса пароля в минутах', isSecret: false, requiresRestart: false },
  { key: 'FRONTEND_URL', valueType: 'string', defaultValue: '', description: 'Базовый URL фронтенда для ссылок в письмах', isSecret: false, requiresRestart: false },
  { key: 'FORAN_SERVICE_URL', valueType: 'string', defaultValue: '', description: 'Базовый URL отдельного FORAN backend для HTTP API', isSecret: false, requiresRestart: false },
  { key: 'ROCKET_CHAT_URL', valueType: 'string', defaultValue: '', description: 'Базовый URL Rocket.Chat', isSecret: false, requiresRestart: false },
  { key: 'ROCKET_CHAT_TOKEN', valueType: 'string', defaultValue: '', description: 'Токен Rocket.Chat REST API', isSecret: true, requiresRestart: false },
  { key: 'ROCKET_CHAT_USER_ID', valueType: 'string', defaultValue: '', description: 'User ID для Rocket.Chat token auth', isSecret: true, requiresRestart: false },
  { key: 'ROCKET_CHAT_LOGIN', valueType: 'string', defaultValue: '', description: 'Логин сервисного пользователя Rocket.Chat', isSecret: false, requiresRestart: false },
  { key: 'ROCKET_CHAT_PASSWORD', valueType: 'string', defaultValue: '', description: 'Пароль сервисного пользователя Rocket.Chat', isSecret: true, requiresRestart: false },
  { key: 'SMTP_HOST', valueType: 'string', defaultValue: '', description: 'SMTP host', isSecret: false, requiresRestart: false },
  { key: 'SMTP_PORT', valueType: 'number', defaultValue: 587, description: 'SMTP port', isSecret: false, requiresRestart: false },
  { key: 'SMTP_USER', valueType: 'string', defaultValue: '', description: 'SMTP username', isSecret: false, requiresRestart: false },
  { key: 'SMTP_PASS', valueType: 'string', defaultValue: '', description: 'SMTP password', isSecret: true, requiresRestart: false },
  { key: 'SMTP_SECURE', valueType: 'boolean', defaultValue: false, description: 'Использовать TLS для SMTP', isSecret: false, requiresRestart: false },
  { key: 'EMAIL_FROM', valueType: 'string', defaultValue: '', description: 'Отправитель email уведомлений', isSecret: false, requiresRestart: false },
  { key: 'LOCAL_UPLOADS_DIR', valueType: 'string', defaultValue: 'uploads', description: 'Локальный каталог загруженных файлов', isSecret: false, requiresRestart: true },
  { key: 'LOCAL_UPLOADS_MOUNT_PATH', valueType: 'string', defaultValue: '/backend/uploads', description: 'Публичный mount path локальных файлов', isSecret: false, requiresRestart: true },
  { key: 'S3_ENDPOINT', valueType: 'string', defaultValue: '', description: 'S3 endpoint', isSecret: false, requiresRestart: false },
  { key: 'S3_REGION', valueType: 'string', defaultValue: 'ru-central1', description: 'S3 region', isSecret: false, requiresRestart: false },
  { key: 'S3_ACCESS_KEY_ID', valueType: 'string', defaultValue: '', description: 'S3 access key id', isSecret: true, requiresRestart: false },
  { key: 'S3_SECRET_ACCESS_KEY', valueType: 'string', defaultValue: '', description: 'S3 secret access key', isSecret: true, requiresRestart: false },
  { key: 'S3_DEFAULT_BUCKET', valueType: 'string', defaultValue: '', description: 'Бакет по умолчанию для файлов', isSecret: false, requiresRestart: false },
  { key: 'COMPANY_NAME', valueType: 'string', defaultValue: 'Deep Sea', description: 'Название компании в уведомлениях', isSecret: false, requiresRestart: false },
  { key: 'COMPANY_LOGO_URL', valueType: 'string', defaultValue: '', description: 'URL логотипа компании в уведомлениях', isSecret: false, requiresRestart: false },
  { key: 'COMPANY_ADDRESS', valueType: 'string', defaultValue: '', description: 'Адрес компании в уведомлениях', isSecret: false, requiresRestart: false },
  { key: 'SUPPORT_EMAIL', valueType: 'string', defaultValue: '', description: 'Контактный email поддержки', isSecret: false, requiresRestart: false },
  { key: 'DEBUG_PAGES', valueType: 'boolean', defaultValue: false, description: 'Включить отладочное логирование pages service', isSecret: false, requiresRestart: false }
];

const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]));

function getDefinition(key) {
  return definitionsByKey.get(String(key || '')) || null;
}

function listDefinitions() {
  return definitions.slice();
}

function normalizeBoolean(value, key) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  const err = new Error(`Invalid boolean value for ${key}`);
  err.statusCode = 400;
  throw err;
}

function normalizeNumber(value, key) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    const err = new Error(`Invalid numeric value for ${key}`);
    err.statusCode = 400;
    throw err;
  }
  return numberValue;
}

function normalizeValue(key, value) {
  const definition = getDefinition(key);
  if (!definition) {
    const err = new Error(`Unsupported environment setting key: ${key}`);
    err.statusCode = 400;
    throw err;
  }
  if (value === undefined) {
    const err = new Error(`Value is required for ${key}`);
    err.statusCode = 400;
    throw err;
  }
  switch (definition.valueType) {
    case 'boolean':
      return normalizeBoolean(value, key);
    case 'number':
      return normalizeNumber(value, key);
    case 'string':
    default:
      return value === null ? '' : String(value);
  }
}

function serializeValue(key, value) {
  const definition = getDefinition(key);
  const normalizedValue = normalizeValue(key, value);
  if (definition.valueType === 'boolean') return normalizedValue ? 'true' : 'false';
  return String(normalizedValue);
}

function deserializeValue(key, value) {
  const definition = getDefinition(key);
  if (!definition) return value;
  if (value === null || value === undefined) return null;
  switch (definition.valueType) {
    case 'boolean':
      return normalizeBoolean(value, key);
    case 'number':
      return normalizeNumber(value, key);
    case 'string':
    default:
      return String(value);
  }
}

module.exports = {
  listDefinitions,
  getDefinition,
  normalizeValue,
  serializeValue,
  deserializeValue
};