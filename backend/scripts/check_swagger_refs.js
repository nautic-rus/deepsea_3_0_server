const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs', 'api', 'swagger.json');
let spec;
try {
  spec = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error('Failed to read/parse swagger.json:', e.message);
  process.exit(2);
}
const bad = [];
function walk(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (k === '$ref' && typeof v === 'string') {
      if (v.indexOf('components/schemas') !== -1 && !v.startsWith('#')) {
        bad.push(v);
      }
    } else {
      walk(v);
    }
  }
}
walk(spec);
if (bad.length) {
  console.error('Found local $ref values missing "#" prefix pointing to components/schemas:');
  for (const r of bad) console.error('  ', r);
  process.exit(3);
}
console.log('No bad local component $ref values found.');
process.exit(0);
