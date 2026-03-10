const fs = require('fs');
const path = require('path');

const PREFERRED_DIR = '/var/log/deepsea';
let logDir = PREFERRED_DIR;

// Fallback to repository-local backend/logs if /var/log/deepsea isn't writable
try {
  fs.mkdirSync(PREFERRED_DIR, { recursive: true });
  fs.accessSync(PREFERRED_DIR, fs.constants.W_OK);
} catch (err) {
  logDir = path.join(__dirname, '..', '..', 'logs');
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) { /* ignore */ }
}

const logFile = path.join(logDir, 'app.log');
const stream = fs.createWriteStream(logFile, { flags: 'a' });

function formatArg(a) {
  if (a instanceof Error) return a.stack || a.message;
  if (typeof a === 'object') {
    try { return JSON.stringify(a); } catch (e) { return String(a); }
  }
  return String(a);
}

function writeToFile(level, args) {
  const msg = args.map(formatArg).join(' ');
  const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
  stream.write(line);
}

['log', 'info', 'warn', 'error', 'debug'].forEach((level) => {
  const original = console[level] || console.log;
  console[level] = function(...args) {
    try { writeToFile(level.toUpperCase(), args); } catch (e) { /* ignore */ }
    original.apply(console, args);
  };
});

module.exports = { logFile };
