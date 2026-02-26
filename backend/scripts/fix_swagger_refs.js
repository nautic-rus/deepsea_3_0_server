const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs', 'api', 'swagger.json');
const bak = file + '.bak';
try {
  fs.copyFileSync(file, bak, fs.constants.COPYFILE_EXCL);
  console.log('Backup created at', bak);
} catch (e) {
  if (e.code === 'EEXIST') console.log('Backup already exists at', bak);
  else console.error('Failed to create backup:', e.message);
}
let s = fs.readFileSync(file, 'utf8');
const re = /"\$ref"\s*:\s*"[\.\/]*components\/schemas\//g;
const replaced = s.replace(re, '"$ref": "#/components/schemas/');
if (replaced === s) {
  console.log('No replacements needed.');
  process.exit(0);
}
fs.writeFileSync(file, replaced, 'utf8');
console.log('Replacements applied.');
process.exit(0);
