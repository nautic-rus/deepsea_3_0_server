const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../docs/api/swagger.json');
const obj = JSON.parse(fs.readFileSync(p,'utf8'));
let moved = 0;
for (const basePath of Object.keys(obj.paths)) {
  const item = obj.paths[basePath];
  for (const key of Object.keys(item)) {
    if (key.startsWith('/')) {
      // nested path found; move to top-level if not present
      if (!obj.paths[key]) {
        obj.paths[key] = item[key];
        delete item[key];
        moved++;
      } else {
        // if exists, skip but remove nested to avoid schema errors
        delete item[key];
        moved++;
      }
    }
  }
}
if (moved>0) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2)+'\n','utf8');
}
console.log('Moved', moved, 'nested paths to top-level');
