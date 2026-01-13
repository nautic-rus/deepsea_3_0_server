const fs = require('fs');
const p = 'backend/docs/api/swagger.json';
try {
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ops = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
  const missingResponses = [];
  const missing2xx = [];
  const noSchema = [];
  const badRefs = [];
  for (const [pp, pobj] of Object.entries(s.paths || {})) {
    for (const m of ops) {
      if (pobj[m]) {
        const op = pobj[m];
        if (!op.responses || Object.keys(op.responses).length === 0) missingResponses.push(`${m.toUpperCase()} ${pp}`);
        else {
          const has2xx = Object.keys(op.responses).some(k => /^2/.test(k));
          if (!has2xx) missing2xx.push(`${m.toUpperCase()} ${pp}`);
          for (const [status, resp] of Object.entries(op.responses || {})) {
            if (resp && resp.content) {
              for (const [ctype, cdesc] of Object.entries(resp.content)) {
                if (!cdesc.schema && cdesc.example === undefined) noSchema.push(`${m.toUpperCase()} ${pp} -> ${status} content ${ctype} missing schema`);
                if (cdesc.schema && cdesc.schema.$ref) {
                  const ref = cdesc.schema.$ref;
                  const name = ref.replace('#/components/schemas/', '');
                  if (!s.components || !s.components.schemas || !s.components.schemas[name]) badRefs.push(`${m.toUpperCase()} ${pp} -> ${status} -> ${ref}`);
                }
              }
            }
          }
        }
      }
    }
  }
  const result = { missingResponses, missing2xx, noSchema, badRefs };
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error('PARSE_ERR', e.message);
  process.exit(2);
}
