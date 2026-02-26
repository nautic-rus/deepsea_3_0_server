const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs', 'api', 'swagger.json');
const bak = file + '.pre_inject.bak';
try { fs.copyFileSync(file, bak, fs.constants.COPYFILE_EXCL); console.log('Backup created at', bak); } catch (e) { if (e.code === 'EEXIST') console.log('Backup already exists at', bak); else console.error('Backup failed:', e.message); }
let s = fs.readFileSync(file,'utf8');
const schemasKey = '"schemas"';
const pos = s.indexOf(schemasKey);
if (pos === -1) { console.error('Could not find "schemas" key in swagger.json'); process.exit(2); }
const braceStart = s.indexOf('{', pos);
if (braceStart === -1) { console.error('Could not find opening brace for schemas object'); process.exit(2); }
// Find matching closing brace for this object
let depth = 0;
let i = braceStart;
let endIndex = -1;
for (; i < s.length; i++) {
  const ch = s[i];
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { endIndex = i; break; }
  }
}
if (endIndex === -1) { console.error('Could not find end of schemas object'); process.exit(2); }
const schemasText = s.slice(braceStart, endIndex+1);
// Check presence
const hasDocument = /"Document"\s*:\s*\{/m.test(schemasText);
const hasEntityLink = /"EntityLink"\s*:\s*\{/m.test(schemasText);
let insert = '';
if (!hasEntityLink) {
  insert += `  "EntityLink": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "active_type": { "type": "string" },
      "active_id": { "type": "integer" },
      "passive_type": { "type": "string" },
      "passive_id": { "type": "integer" },
      "relation_type": { "type": "string" },
      "created_by": { "type": "integer", "nullable": true },
      "created_at": { "type": "string", "format": "date-time" }
    }
  }`;
}
if (!hasDocument) {
  if (insert) insert += ',\n';
  insert += `  "Document": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "title": { "type": "string" },
      "description": { "type": "string", "nullable": true },
      "code": { "type": "string", "nullable": true, "description": "Document number/code" },
      "project_id": { "type": "integer" },
      "created_at": { "type": "string", "format": "date-time" },
      "updated_at": { "type": "string", "format": "date-time" }
    }
  }`;
}
if (!insert) { console.log('Both schemas already present; nothing to do.'); process.exit(0); }
// Insert before endIndex (before final closing brace). We need to ensure comma if necessary.
// Find position before endIndex to see if existing content ends with whitespace/newline; we'll insert with a leading comma if the schemas object currently has at least one property.
// Determine if there's any non-space between braceStart+1 and endIndex-1; if yes, there are existing entries, so we need to append a comma before our insert.
const inner = s.slice(braceStart+1, endIndex).trim();
const needsComma = inner.length > 0;
const insertion = (needsComma ? ',\n' : '\n') + insert + '\n';
const newText = s.slice(0, endIndex) + insertion + s.slice(endIndex);
fs.writeFileSync(file, newText, 'utf8');
console.log('Injected missing schemas (EntityLink/Document if they were absent).');
process.exit(0);
