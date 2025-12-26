const fs = require('fs');
const path = process.argv[2];
if(!path){ console.error('Usage: node check_brace_depth.js <file>'); process.exit(2); }
const s = fs.readFileSync(path,'utf8');
let depth = 0, inStr = false, esc = false;
for(let i=0;i<s.length;i++){
  const c = s[i];
  if(!inStr){
    if(c === '{') depth++;
    else if(c === '}'){
      depth--;
      if(depth === 0){
        console.log('first-zero-pos', i);
        console.log('context after 80 chars:\n', s.slice(i-80, i+80));
        process.exit(0);
      }
    }
  }
  if(c === '"' && !esc) inStr = !inStr;
  if(c === '\\' && !esc) esc = true; else esc = false;
}
console.log('end depth', depth);
