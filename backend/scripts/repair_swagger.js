const fs = require('fs');
const path = process.argv[2];
if(!path){ console.error('Usage: node repair_swagger.js <file>'); process.exit(2); }
let s = fs.readFileSync(path,'utf8');
const compIdx = s.indexOf('"components"');
const pathsIdx = s.indexOf('\"paths\"');
if(compIdx === -1 || pathsIdx === -1){ console.error('Could not find components or paths'); process.exit(3); }
// find opening brace for components value
const compOpen = s.indexOf('{', compIdx);
if(compOpen === -1 || compOpen > pathsIdx){ console.error('Malformed: components open not found'); process.exit(4); }
// find matching closing brace for components
let depth = 0, inStr=false, esc=false, compClose=-1;
for(let i=compOpen;i<s.length;i++){
  const c = s[i];
  if(!inStr){ if(c==='{') depth++; else if(c==='}') { depth--; if(depth===0){ compClose = i; break; } } }
  if(c==='"' && !esc) inStr = !inStr;
  if(c==='\\' && !esc) esc = true; else esc = false;
}
if(compClose===-1){ console.error('Could not find end of components'); process.exit(5); }
const componentsBlock = s.slice(compOpen, compClose+1);
// find start of paths object
const pathsStart = s.indexOf('{', pathsIdx);
if(pathsStart===-1){ console.error('paths start not found'); process.exit(6); }
// find matching closing for paths
depth=0; inStr=false; esc=false; let pathsClose=-1;
for(let i=pathsStart;i<s.length;i++){
  const c=s[i];
  if(!inStr){ if(c==='{') depth++; else if(c==='}') { depth--; if(depth===0){ pathsClose = i; break; } } }
  if(c==='"' && !esc) inStr=!inStr;
  if(c==='\\' && !esc) esc=true; else esc=false;
}
if(pathsClose===-1){ console.error('Could not find end of paths'); process.exit(7); }
const pathsBlock = s.slice(pathsStart, pathsClose+1);
// Build new root: take part before components key
const beforeComponents = s.slice(0, compIdx);
// try to extract everything before the key name, up to previous comma or newline
// find start of line containing "components"
const lineStart = beforeComponents.lastIndexOf('\n', compIdx) !== -1 ? beforeComponents.lastIndexOf('\n', compIdx) + 1 : 0;
const prefix = s.slice(0, lineStart);
// Collect other keys before components - use prefix directly
const newJson = prefix + '  "components": ' + componentsBlock + ',\n  "paths": ' + pathsBlock + '\n}\n';
fs.writeFileSync(path, newJson,'utf8');
console.log('Rewrote file with reconstructed components and paths.');
