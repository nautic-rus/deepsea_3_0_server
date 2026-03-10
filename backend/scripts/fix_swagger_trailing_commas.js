#!/usr/bin/env node
const fs = require('fs');
const p = 'docs/api/swagger.json';
const s = fs.readFileSync(p, 'utf8');
function removeTrailingCommas(s) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\') { out += ch; esc = true; continue; }
      if (ch === '"') { out += ch; inStr = false; continue; }
      out += ch; continue;
    } else {
      if (ch === '"') { out += ch; inStr = true; continue; }
      if (ch === ',') {
        let j = i + 1;
        while (j < s.length && /\s/.test(s[j])) j++;
        if (s[j] === '}' || s[j] === ']') {
          continue; // skip trailing comma
        }
        out += ch;
        continue;
      }
      out += ch;
    }
  }
  return out;
}
const fixed = removeTrailingCommas(s);
try {
  JSON.parse(fixed);
  fs.writeFileSync(p, fixed, 'utf8');
  console.log('FIXED_OK');
} catch (e) {
  fs.writeFileSync(p + '.fixed', fixed, 'utf8');
  console.error('PARSE_FAILED', e && e.message ? e.message : e);
  process.exit(1);
}
