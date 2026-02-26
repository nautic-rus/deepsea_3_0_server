const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../docs/api/swagger.json');
const backupPath = filePath + '.bak-before-sort-tags';

console.log('Reading', filePath);
const text = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(backupPath, text, 'utf8');
console.log('Backup written to', backupPath);

const spec = JSON.parse(text);

const used = new Set();
if (spec.paths) {
  Object.values(spec.paths).forEach(pathItem => {
    if (!pathItem) return;
    Object.values(pathItem).forEach(op => {
      if (!op) return;
      if (Array.isArray(op.tags)) {
        op.tags.forEach(t => used.add(t));
      }
    });
  });
}

// include existing top-level tag names as well
const existingTagMap = new Map();
if (Array.isArray(spec.tags)) {
  spec.tags.forEach(t => {
    if (t && t.name) {
      existingTagMap.set(t.name, t);
      used.add(t.name);
    }
  });
}

const names = Array.from(used).sort((a,b)=> a.localeCompare(b, 'ru', {sensitivity: 'base'}));

const newTags = names.map(name => {
  const existing = existingTagMap.get(name);
  if (existing) return existing;
  return { name, description: '' };
});

spec.tags = newTags;

fs.writeFileSync(filePath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
console.log('Updated tags count =', newTags.length);
console.log('Wrote updated swagger to', filePath);
