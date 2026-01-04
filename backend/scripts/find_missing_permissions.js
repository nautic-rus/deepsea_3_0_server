const fs = require('fs');
const path = require('path');

const swaggerPath = path.resolve(__dirname, '../docs/api/swagger.json');
const seedPath = path.resolve(__dirname, '../src/db/seeds/seed_permissions.js');

const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
const seedSrc = fs.readFileSync(seedPath, 'utf8');

function extractXPermissions(swagger) {
  const perms = new Set();
  const paths = swagger.paths || {};
  for (const [p, methods] of Object.entries(paths)) {
    for (const [m, op] of Object.entries(methods)) {
      if (op && op['x-permissions']) {
        const arr = op['x-permissions'];
        if (Array.isArray(arr)) arr.forEach(x => perms.add(x));
        else if (typeof arr === 'string') perms.add(arr);
      }
    }
  }
  return Array.from(perms).sort();
}

function extractSeedPermissions(seedSrc) {
  // naive parse: find PERMISSIONS = [ ... ]; and eval the array portion
  const m = seedSrc.match(/const\s+PERMISSIONS\s*=\s*(\[[\s\S]*?\]);/m);
  if (!m) return [];
  const arrSrc = m[1];
  try {
    // sanitize: replace single-line comments
    const cleaned = arrSrc.replace(/\/\/.*$/mg, '').replace(/\n/g, '\n');
    // use Function to evaluate safely within limited scope
    const func = new Function('return ' + cleaned);
    const arr = func();
    return (arr || []).map(p => p.code).filter(Boolean).sort();
  } catch (e) {
    console.error('Failed to parse PERMISSIONS array:', e.message);
    return [];
  }
}

const swaggerPerms = extractXPermissions(swagger);
const seedPerms = extractSeedPermissions(seedSrc);

const missing = swaggerPerms.filter(p => !seedPerms.includes(p));

console.log('Permissions in swagger.json:', swaggerPerms.length);
console.log(swaggerPerms.join('\n'));
console.log('\nPermissions in seed file:', seedPerms.length);
console.log(seedPerms.join('\n'));

if (missing.length === 0) {
  console.log('\nNo missing permissions.');
} else {
  console.log('\nMissing permissions (to add):', missing.length);
  missing.forEach(code => {
    // derive a human-friendly name
    const parts = code.split('.');
    const action = parts.pop() || code;
    const resource = parts.join('.') || '';
    const name = `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`;
    console.log(`- { code: '${code}', name: '${name}', description: 'Auto-added from swagger: ${code}' }`);
  });
}
