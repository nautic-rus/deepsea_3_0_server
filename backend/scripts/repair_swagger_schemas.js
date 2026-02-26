const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../docs/api/swagger.json');
const backupPath = filePath + '.bak-before-repair-schemas';
fs.writeFileSync(backupPath, fs.readFileSync(filePath,'utf8'));
console.log('Backup created at', backupPath);
let text = fs.readFileSync(filePath,'utf8');

const startIdx = text.indexOf('"schemas":');
if (startIdx === -1) {
  console.error('No "schemas" block found');
  process.exit(1);
}
// find the opening brace of schemas
const braceOpenIdx = text.indexOf('{', startIdx);
if (braceOpenIdx === -1) {
  console.error('Malformed schemas block'); process.exit(1);
}

// We'll scan forward and extract candidate schema entries whose names start with uppercase letter
const schemas = {};
const re = /\n\s*"([A-Z][A-Za-z0-9_]*)"\s*:\s*\{/g;
let match;
while ((match = re.exec(text)) !== null) {
  const name = match[1];
  const openPos = text.indexOf('{', match.index + match[0].length - 1);
  if (openPos === -1) continue;
  // find matching closing brace for this opening brace
  let depth = 0;
  let i = openPos;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) {
    console.warn('Unbalanced braces for schema', name); continue;
  }
  const objText = text.slice(openPos, i+1);
  schemas[name] = objText;
}

const names = Object.keys(schemas);
if (names.length === 0) {
  console.error('No schemas extracted'); process.exit(1);
}
console.log('Extracted schemas:', names.length);

// Build new schemas block
let newSchemasText = '{\n';
names.forEach((name, idx) => {
  newSchemasText += `  "${name}": ${schemas[name]}`;
  if (idx !== names.length-1) newSchemasText += ',\n';
  else newSchemasText += '\n';
});
newSchemasText += '}';

// Replace the old schemas block: find the position of the schemas opening brace and find the matching closing brace
let depth = 0;
let j = braceOpenIdx;
for (; j < text.length; j++) {
  if (text[j] === '{') depth++;
  else if (text[j] === '}') {
    depth--;
    if (depth === 0) break;
  }
}
if (depth !== 0) { console.error('Could not find end of schemas block'); process.exit(1); }
const newText = text.slice(0, braceOpenIdx) + newSchemasText + text.slice(j+1);
fs.writeFileSync(filePath, newText,'utf8');
console.log('Replaced schemas block with', names.length, 'schemas');

// validate
try{
  JSON.parse(newText);
  console.log('JSON.parse OK');
} catch(e) {
  console.error('JSON parse failed after replacement:', e.message);
  process.exit(1);
}
