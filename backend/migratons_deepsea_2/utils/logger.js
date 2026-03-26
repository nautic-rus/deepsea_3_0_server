/**
 * Утилита логирования для миграционных скриптов.
 *
 * Пишет одновременно в консоль и в лог-файл в директории `migratons_deepsea_2/logs/`.
 * Имя файла: `<scriptName>_YYYY-MM-DD_HH-mm-ss.log`
 *
 * Использование:
 *   const logger = require('../utils/logger')('migrate_users');
 *   logger.info('message');
 *   logger.warn('message');
 *   logger.error('message');
 *   logger.close();  // вызвать в самом конце скрипта
 */

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

// Гарантируем, что директория logs существует
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function pad(n) { return String(n).padStart(2, '0'); }

function timestamp() {
  const d = new Date();
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
  );
}

function fileTimestamp() {
  const d = new Date();
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' +
    pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds())
  );
}

/**
 * Создаёт логгер для конкретного скрипта.
 * @param {string} scriptName — имя скрипта (без расширения), используется в имени лог-файла.
 * @returns {{ info, warn, error, close }}
 */
function createLogger(scriptName) {
  const logFile = path.join(logsDir, `${scriptName}_${fileTimestamp()}.log`);
  const stream = fs.createWriteStream(logFile, { flags: 'a' });

  function write(level, args) {
    const ts = timestamp();
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const line = `[${ts}] [${level}] ${msg}`;

    // В файл
    stream.write(line + '\n');

    // В консоль (с цветом)
    if (level === 'ERROR') {
      console.error(line);
    } else if (level === 'WARN') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    info:  (...args) => write('INFO',  args),
    warn:  (...args) => write('WARN',  args),
    error: (...args) => write('ERROR', args),
    /** Путь к текущему лог-файлу */
    logFile,
    /** Закрыть поток записи — вызвать в конце скрипта */
    close: () => stream.end(),
  };
}

module.exports = createLogger;
