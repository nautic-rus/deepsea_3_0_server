/**
 * Точка входа сервера
 */

// Загрузка переменных окружения (use repository `env` file so server and scripts behave the same)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'env') });

const app = require('./app');
const config = require('./config');

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.env}`);
});

