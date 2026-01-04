const fs = require('fs');
const path = require('path');

const swaggerPath = path.resolve(__dirname, '../docs/api/swagger.json');
const postmanPath = path.resolve(__dirname, '../docs/api/postman_collection.json');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

const swagger = loadJson(swaggerPath);
let postman = null;
try { postman = loadJson(postmanPath); } catch (e) { postman = null; }

const baseUrlVar = '{{baseUrl}}';
const collection = {
  info: postman ? postman.info : { name: 'DeepSea API - Generated from Swagger', _postman_id: 'deepsea-swagger-generated', description: 'Auto-generated Postman collection from backend/docs/api/swagger.json.', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: postman ? postman.variable : [ { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' }, { key: 'accessToken', value: '', type: 'string' } ],
  item: []
};

// group by tags roughly using first tag or path prefix
const paths = swagger.paths || {};
for (const [p, methods] of Object.entries(paths)) {
  for (const [m, op] of Object.entries(methods)) {
    const method = m.toUpperCase();
    const name = `${method} ${p}`;
    const hasAuth = (op.security && op.security.length > 0) || false;
    const permissions = op['x-permissions'] || null;
    const summary = op.summary || '';
    const description = op.description || '';
    const descLines = [];
    if (summary) descLines.push(summary);
    if (description) descLines.push(description);
    if (permissions) descLines.push('\nRequired permissions: ' + (Array.isArray(permissions) ? permissions.join(', ') : permissions));
    const requestDescription = descLines.join('\n\n');

    const headers = [];
    if (hasAuth) headers.push({ key: 'Authorization', value: 'Bearer {{accessToken}}' });
    if (op.requestBody) headers.push({ key: 'Content-Type', value: 'application/json' });

    // Build body stub if requestBody schema has example or properties
    let body = null;
    if (op.requestBody && op.requestBody.content && op.requestBody.content['application/json']) {
      const schema = op.requestBody.content['application/json'].schema || {};
      // try to create a simple stub from required fields
      const stub = {};
      if (schema.properties) {
        for (const [k, v] of Object.entries(schema.properties)) {
          if (v.example !== undefined) stub[k] = v.example;
          else if (v.type === 'integer') stub[k] = 0;
          else if (v.type === 'number') stub[k] = 0;
          else if (v.type === 'boolean') stub[k] = false;
          else stub[k] = v.example || (v.type === 'string' ? '' : null);
        }
      }
      body = { mode: 'raw', raw: JSON.stringify(stub, null, 2), options: { raw: { language: 'json' } } };
    }

    const urlRaw = baseUrlVar + p.replace(/{/g, '{{').replace(/}/g, '}}');
    const item = {
      name,
      request: {
        method,
        header: headers,
        body: body,
        url: { raw: urlRaw }
      }
    };
    if (requestDescription) item.request.description = requestDescription;

    collection.item.push(item);
  }
}

fs.writeFileSync(postmanPath, JSON.stringify(collection, null, 2), 'utf8');
console.log('Postman collection generated to', postmanPath);
