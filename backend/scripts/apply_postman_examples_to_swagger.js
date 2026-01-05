const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const url = require('url');

const swaggerYamlPath = path.join(__dirname, '../docs/api/swagger.yaml');
const swaggerJsonPath = path.join(__dirname, '../docs/api/swagger.json');
const postmanFlatPath = path.join(__dirname, '../docs/api/postman_collection.flat.json');

if (!fs.existsSync(swaggerYamlPath)) { console.error('Missing', swaggerYamlPath); process.exit(2); }
if (!fs.existsSync(postmanFlatPath)) { console.error('Missing', postmanFlatPath); process.exit(2); }

const swagger = yaml.load(fs.readFileSync(swaggerYamlPath, 'utf8'));
const pm = JSON.parse(fs.readFileSync(postmanFlatPath, 'utf8'));

// Build swagger path matchers
const swaggerPaths = Object.keys((swagger && swagger.paths) || {});
const pathMatchers = swaggerPaths.map(p => {
  // build regex replacing {param} with ([^/]+)
  const reStr = '^' + p.replace(/\{[^}]+\}/g, '([^/]+)') + '$';
  return { template: p, re: new RegExp(reStr) };
});

function stripBase(raw) {
  if (!raw) return '';
  // remove {{baseUrl}} or full base urls
  return raw.replace(/\{\{baseUrl\}\}/g, '').replace(/https?:\/\/[^/]+/, '');
}

function findSwaggerPathForUrl(pathname) {
  // try exact match first
  if (swaggerPaths.includes(pathname)) return pathname;
  // try regex match
  for (const m of pathMatchers) {
    if (m.re.test(pathname)) return m.template;
  }
  // try trimming trailing slash
  const t = pathname.replace(/\/$/, '');
  if (swaggerPaths.includes(t)) return t;
  for (const m of pathMatchers) {
    if (m.re.test(t)) return m.template;
  }
  return null;
}

function ensureParametersObj(op) {
  if (!op.parameters) op.parameters = [];
}

let applied = 0;

(function processItems(items) {
  items.forEach(item => {
    if (item.item) return processItems(item.item);
    const req = item.request;
    if (!req) return;

    const method = (req.method || 'GET').toLowerCase();
    let rawUrl = '';
    if (typeof req.url === 'string') rawUrl = req.url;
    else if (req.url && req.url.raw) rawUrl = req.url.raw;
    rawUrl = stripBase(rawUrl);

    // parse path and query
    let parsedPath = rawUrl.split('?')[0] || rawUrl;
    parsedPath = parsedPath.replace(/\/+$|^\s+|\s+$/g, '');
    if (!parsedPath.startsWith('/')) parsedPath = '/' + parsedPath;

    const queryPart = (rawUrl.split('?')[1] || '');
    const queryParams = new url.URLSearchParams(queryPart);

    const swaggerPath = findSwaggerPathForUrl(parsedPath);
    if (!swaggerPath) return;

    const pathObj = swagger.paths[swaggerPath];
    if (!pathObj) return;
    const op = pathObj[method];
    if (!op) return;

    // Add examples for parameters (query and path params)
    // Gather path param values by matching regex
    const pathMatcher = pathMatchers.find(m => m.template === swaggerPath);
    let pathValues = [];
    if (pathMatcher) {
      const m = pathMatcher.re.exec(parsedPath);
      if (m) pathValues = m.slice(1);
    }

    // Ensure parameters array exists
    ensureParametersObj(op);

    // Map path parameters positions to names
    const pathParamNames = [];
    const match = swaggerPath.match(/\{([^}]+)\}/g) || [];
    match.forEach((mp) => {
      pathParamNames.push(mp.replace(/[{}]/g, ''));
    });

    // Assign examples to path params
    pathParamNames.forEach((name, idx) => {
      const val = pathValues[idx];
      if (!val) return;
      // find param in op.parameters or push one
      let param = op.parameters.find(p => p.in === 'path' && p.name === name);
      if (!param) {
        param = { name, in: 'path', required: true, schema: { type: 'string' } };
        op.parameters.push(param);
      }
      if (!param.example) param.example = val;
      applied++;
    });

    // Assign examples to query params
    for (const [k,v] of queryParams.entries()) {
      let param = op.parameters.find(p => p.in === 'query' && p.name === k);
      if (!param) {
        param = { name: k, in: 'query', schema: { type: 'string' } };
        op.parameters.push(param);
      }
      if (!param.example) param.example = v;
      applied++;
    }

    // Request body
    if (req.body && req.body.raw) {
      let raw = req.body.raw;
      // If the raw contains variables like {{createdProjectId}}, keep as string
      try {
        const parsed = JSON.parse(raw);
        if (!op.requestBody) op.requestBody = { content: { 'application/json': { schema: { type: 'object' } } } };
        const content = op.requestBody.content = op.requestBody.content || {};
        content['application/json'] = content['application/json'] || { schema: { type: 'object' } };
        // set example
        if (!content['application/json'].example) content['application/json'].example = parsed;
        applied++;
      } catch (e) {
        // not JSON - store raw example
        if (!op.requestBody) op.requestBody = { content: { 'text/plain': { schema: { type: 'string' } } } };
        const content = op.requestBody.content = op.requestBody.content || {};
        content['text/plain'] = content['text/plain'] || { schema: { type: 'string' } };
        if (!content['text/plain'].example) content['text/plain'].example = raw;
        applied++;
      }
    }
  });
})(pm.item || []);

fs.writeFileSync(swaggerYamlPath, yaml.dump(swagger, { noRefs: true, lineWidth: 120 }));
console.log('WROTE', swaggerYamlPath, 'examples applied:', applied);

// regenerate swagger.json (best-effort by calling regen script if present)
try {
  const regen = path.join(__dirname, 'regen_swagger_json.js');
  if (fs.existsSync(regen)) {
    console.log('Regenerating swagger.json...');
    require(regen);
    console.log('Regenerated', swaggerJsonPath);
  } else {
    console.log('No regen script found at', regen);
  }
} catch (e) {
  console.error('Failed to regenerate swagger.json', e.message);
}
