const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs', 'api', 'swagger.json');
let spec;
try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('Failed to parse swagger.json', e.message); process.exit(2); }
const missing = [];
function walk(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (k === '$ref' && typeof v === 'string') {
      if (v.startsWith('#/components/schemas/')) {
        const name = v.slice('#/components/schemas/'.length);
        if (!spec.components || !spec.components.schemas || typeof spec.components.schemas[name] === 'undefined') {
          missing.push({ ref: v, name });
        }
      }
    } else {
      walk(v);
    }
  }
}
walk(spec);
if (missing.length) {
  console.error('Missing component schemas referenced by $ref:');
  for (const m of missing) console.error(' ', m.ref);
  process.exit(3);
}
console.log('All component schema $ref entries resolve to existing schema definitions.');
process.exit(0);
