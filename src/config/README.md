# Конфигурация

## Подключение к базе данных

Конфигурация подключения к PostgreSQL находится в файле `database.js` или `database.ts`.

### Использование

```javascript
// JavaScript
const dbConfig = require('./config/database');

// TypeScript
import dbConfig from './config/database';
```

### Переменные окружения

Создайте файл `.env` в корне проекта `backend/` со следующими переменными:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=deepsea_3_0
DB_USER=spiridovich
DB_PASSWORD=
NODE_ENV=development
```

### Окружения

- **development** - разработка (по умолчанию)
- **production** - продакшн
- **test** - тестирование

### Пример использования с pg (node-postgres)

```javascript
const { Pool } = require('pg');
const dbConfig = require('./config/database');

const pool = new Pool(dbConfig);

// Использование
pool.query('SELECT * FROM users', (err, res) => {
  if (err) {
    console.error('Error executing query', err);
  } else {
    console.log(res.rows);
  }
});
```

### Пример использования с Sequelize

```javascript
const { Sequelize } = require('sequelize');
const dbConfig = require('./config/database');

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.user,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    pool: {
      max: dbConfig.max,
      idle: dbConfig.idleTimeoutMillis,
    },
  }
);
```

