const fs = require('fs');
const routes = fs.readFileSync('backend/src/api/routes/index.js', 'utf8');
const re = /router\.(get|post|put|delete)\('\/([^']*)'/g;
let r = [];
let m;
while (m = re.exec(routes)) {
  const method = m[1].toUpperCase();
  const path = '/api/' + m[2];
  // normalize :id to {id}
  const norm = path.replace(/:([^/]+)/g, '{$1}');
  r.push(method + ' ' + norm);
}
const swagger = JSON.parse(fs.readFileSync('backend/docs/api/swagger.json', 'utf8'));
const sp = [];
for (const p in swagger.paths) {
  for (const m2 in swagger.paths[p]) {
    sp.push(m2.toUpperCase() + ' ' + p);
  }
}
const onlyRoutes = new Set(r);
const onlySwagger = new Set(sp);
const missingInSwagger = [];
for (const route of onlyRoutes) if (!onlySwagger.has(route)) missingInSwagger.push(route);
const extraInSwagger = [];
for (const s of onlySwagger) if (!onlyRoutes.has(s)) extraInSwagger.push(s);
console.log('routes count', r.length, 'swagger count', sp.length);
console.log('\nMissing in swagger (exists in routes but not in swagger):');
console.log(missingInSwagger.join('\n') || '<none>');
console.log('\nExtra in swagger (exists in swagger but not in routes):');
console.log(extraInSwagger.join('\n') || '<none>');
