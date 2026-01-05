const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const swaggerYamlPath = path.join(__dirname, '../docs/api/swagger.yaml');
const postmanFlatPath = path.join(__dirname, '../docs/api/postman_collection.flat.json');
const postmanPath = path.join(__dirname, '../docs/api/postman_collection.json');

if (!fs.existsSync(swaggerYamlPath)) {
  console.error('Missing', swaggerYamlPath);
  process.exit(2);
}

let pmPathToUse = null;
if (fs.existsSync(postmanFlatPath)) pmPathToUse = postmanFlatPath;
else if (fs.existsSync(postmanPath)) pmPathToUse = postmanPath;
else {
  console.error('Missing postman collection at', postmanFlatPath, 'and', postmanPath);
  process.exit(2);
}

const swagger = yaml.load(fs.readFileSync(swaggerYamlPath, 'utf8'));
const pm = JSON.parse(fs.readFileSync(pmPathToUse, 'utf8'));
const swaggerPaths = Object.keys((swagger && swagger.paths) || {});

function normalizePath(raw) {
  if (!raw) return null;
  // strip base
  raw = raw.replace(/\{\{baseUrl\}\}/g, '').replace(/https?:\/\/[^/]+/, '');
  // remove query
  raw = raw.split('?')[0];
  if (!raw.startsWith('/')) raw = '/' + raw;
  return raw.replace(/\/$/, '');
}

function pathTemplateMatch(path) {
  // exact
  if (swaggerPaths.includes(path)) return path;
  // try template match
  for (const p of swaggerPaths) {
    const re = new RegExp('^' + p.replace(/\{[^}]+\}/g, '[^/]+') + '$');
    if (re.test(path)) return p;
  }
  return null;
}

let updated = 0;
const updatedList = [];

function processItems(items) {
  items.forEach(item => {
    if (item.item) return processItems(item.item);
    const req = item.request;
    if (!req) return;
    const method = (req.method || 'GET').toLowerCase();
    if (method !== 'post' && method !== 'put') return;
    if (!req.body || !req.body.raw) return;

    const rawPath = normalizePath(typeof req.url === 'string' ? req.url : req.url && req.url.raw);
    if (!rawPath) return;
    const template = pathTemplateMatch(rawPath);
    if (!template) return;
    const op = swagger.paths[template] && swagger.paths[template][method];
    if (!op) return;

    const content = op.requestBody && op.requestBody.content && op.requestBody.content['application/json'];
    try {
      const parsed = JSON.parse(req.body.raw);
      if (!op.requestBody) op.requestBody = { content: { 'application/json': { schema: { type: 'object' } } } };
      if (!op.requestBody.content) op.requestBody.content = {};
      if (!op.requestBody.content['application/json']) op.requestBody.content['application/json'] = { schema: { type: 'object' } };
      const target = op.requestBody.content['application/json'];
      if (!target.example || JSON.stringify(target.example) === '{}' ) {
        target.example = parsed;
        updated++;
        updatedList.push({ path: template, method, example: parsed });
      }
    } catch (e) {
      // non-json body, skip
    }
  });
}

processItems(pm.item || []);

if (updated > 0) {
  fs.writeFileSync(swaggerYamlPath, yaml.dump(swagger, { noRefs: true, lineWidth: 120 }));
  // regen
  const regen = path.join(__dirname, 'regen_swagger_json.js');
  if (fs.existsSync(regen)) require(regen);
}

console.log('updated', updated);
if (updatedList.length) console.log(updatedList.map(x=>`${x.method.toUpperCase()} ${x.path}`).join('\n'));
