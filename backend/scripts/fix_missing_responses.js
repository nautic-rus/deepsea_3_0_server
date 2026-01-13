const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const inPath = path.join(__dirname, '../docs/api/swagger.yaml');
if (!fs.existsSync(inPath)) { console.error('Missing', inPath); process.exit(2); }
const content = fs.readFileSync(inPath,'utf8');
const doc = yaml.load(content);
const ops = ['get','post','put','delete','patch','options','head'];
const schemaMap = {
  users: 'User', roles: 'Role', projects: 'Project', issues: 'Issue', documents: 'Document', materials: 'Material', equipment: 'Equipment', specifications: 'Specification', stages: 'Stage', storage: 'Storage', statements: 'Statement', permissions: 'Permission', departments: 'Department'
};
const changed = [];
for(const [p,pobj] of Object.entries(doc.paths||{})){
  for(const m of ops){
    if(pobj[m]){
      const op = pobj[m];
      if(!op.responses || Object.keys(op.responses).length===0){
        // decide status and schema
        const isId = p.includes('{');
        const base = p.split('/').filter(Boolean)[1] || ''; // e.g. api/issues -> issues
        const schemaName = schemaMap[base];
        const responses = {};
        if(m==='post'){
          responses['201'] = { description: 'Created' };
          if(schemaName && doc.components && doc.components.schemas && doc.components.schemas[schemaName]){
            responses['201'].content = { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } };
          }
        } else if(m==='get'){
          responses['200'] = { description: isId ? 'OK' : 'List' };
          if(schemaName && doc.components && doc.components.schemas && doc.components.schemas[schemaName]){
            responses['200'].content = { 'application/json': { schema: isId ? { $ref: `#/components/schemas/${schemaName}` } : { type: 'array', items: { $ref: `#/components/schemas/${schemaName}` } } } };
          }
        } else if(m==='put'){
          responses['200'] = { description: 'OK' };
          if(schemaName && doc.components && doc.components.schemas && doc.components.schemas[schemaName]){
            responses['200'].content = { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } };
          }
        } else if(m==='delete'){
          responses['200'] = { description: 'OK' };
        } else {
          responses['200'] = { description: 'OK' };
        }
        op.responses = responses;
        changed.push(`${m.toUpperCase()} ${p}`);
      }
    }
  }
}
if(changed.length===0){ console.log('No changes needed'); process.exit(0); }
// write back
const out = yaml.dump(doc, { noRefs: true, lineWidth: 120 });
fs.writeFileSync(inPath, out, 'utf8');
console.log('Inserted responses for', changed.length, 'operations');
changed.forEach(c=>console.log('-',c));
