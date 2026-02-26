const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../docs/api/swagger.json');
const spec = JSON.parse(fs.readFileSync(file,'utf8'));

const refs = new Set();
function scan(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) return obj.forEach(scan);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (k === '$ref' && typeof v === 'string' && v.startsWith('#/components/schemas/')) {
      refs.add(v.replace('#/components/schemas/',''));
    } else if (typeof v === 'object') scan(v);
  }
}
scan(spec);

const present = new Set(Object.keys((spec.components && spec.components.schemas) || {}));
const missing = Array.from(refs).filter(n => !present.has(n)).sort();
console.log('Total $ref schema targets found:', refs.size);
console.log('Present schema count:', present.size);
console.log('Missing schemas (count):', missing.length);
if (missing.length) console.log(missing.join('\n'));
process.exit(missing.length?2:0);
