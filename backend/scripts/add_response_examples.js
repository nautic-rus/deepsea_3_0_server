const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const inPath = path.join(__dirname, '../docs/api/swagger.yaml');
if (!fs.existsSync(inPath)) {
  console.error('Missing', inPath);
  process.exit(2);
}

const text = fs.readFileSync(inPath, 'utf8');
const doc = yaml.load(text);
const components = doc.components || {};
const schemas = (components && components.schemas) || {};

function resolveRef(ref) {
  // expect refs like '#/components/schemas/Name'
  if (!ref || !ref.startsWith('#/components/schemas/')) return null;
  const name = ref.replace('#/components/schemas/', '');
  return schemas[name] || null;
}

function exampleFromSchema(schema, depth = 0) {
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref);
    if (resolved) return exampleFromSchema(resolved, depth + 1);
    return null;
  }
  const type = schema.type;
  if (!type) {
    // fallback - try object
    if (schema.properties) return exampleFromSchema({ type: 'object', properties: schema.properties }, depth + 1);
    return null;
  }
  if (type === 'object') {
    const obj = {};
    const props = schema.properties || {};
    Object.keys(props).forEach((k) => {
      const prop = props[k];
      const ex = exampleFromSchema(prop, depth + 1);
      if (ex === null || ex === undefined) {
        // generate sensible placeholder
        if (prop.type === 'integer') obj[k] = 1;
        else if (prop.type === 'boolean') obj[k] = true;
        else if (prop.format === 'date-time') obj[k] = '2020-01-01T00:00:00Z';
        else if (prop.type === 'array') obj[k] = [];
        else obj[k] = '';
      } else {
        obj[k] = ex;
      }
    });
    return obj;
  }
  if (type === 'array') {
    const items = schema.items || {};
    const itEx = exampleFromSchema(items, depth + 1);
    return itEx === null ? [] : [itEx];
  }
  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return true;
  if (type === 'string') {
    if (schema.format === 'date-time') return '2020-01-01T00:00:00Z';
    if (schema.format === 'email') return 'user@example.com';
    return 'string';
  }
  return null;
}

let added = 0;
let updatedOps = 0;

Object.keys(doc.paths || {}).forEach((p) => {
  const methods = doc.paths[p];
  Object.keys(methods).forEach((m) => {
    // skip summary/parameters nodes
    if (['parameters'].includes(m)) return;
    const op = methods[m];
    let opTouched = false;
    op.responses = op.responses || {};
    const successCodes = ['200', '201', '202'];
    successCodes.forEach((code) => {
      const resp = op.responses[code];
      if (resp) {
        resp.content = resp.content || {};
        if (!resp.content['application/json']) {
          // try to add content by looking at response.schema or default
          resp.content['application/json'] = { schema: { type: 'object' } };
          opTouched = true;
          added++;
        }
        const content = resp.content['application/json'];
        if (!content.example) {
          let ex = null;
          if (content.schema) ex = exampleFromSchema(content.schema);
          if (!ex) {
            // try to use a component response schema if x-response-schema is present
            ex = {};
          }
          content.example = ex;
          opTouched = true;
          added++;
        }
      }
    });

    // standard error responses
    const errorCodes = ['400', '401', '403', '404', '500'];
    errorCodes.forEach((code) => {
      const resp = op.responses[code];
      if (resp) {
        resp.content = resp.content || {};
        if (!resp.content['application/json']) {
          resp.content['application/json'] = { schema: { $ref: '#/components/schemas/Error' } };
          opTouched = true;
          added++;
        }
        const content = resp.content['application/json'];
        if (!content.example) {
          content.example = { error: resp.description || 'Error', messages: [resp.description || 'Error details'] };
          opTouched = true;
          added++;
        }
      }
    });

    if (opTouched) updatedOps++;
  });
});

fs.writeFileSync(inPath, yaml.dump(doc, { lineWidth: 120 }));
console.log('WROTE', inPath, 'examples added:', added, 'operations updated:', updatedOps);

process.exit(0);
