const fs = require('fs');
const p = 'backend/docs/api/postman_collection.json';
const collection = JSON.parse(fs.readFileSync(p,'utf8'));
const findGroup = (name) => collection.item.find(i=>i.name===name);
const makeReq = (method, rawBody, path, name, auth=true) => ({
  name: name || `${method} ${path}`,
  request: {
    method,
    header: [ ...(rawBody ? [{ key: 'Content-Type', value: 'application/json' }] : []), ...(auth ? [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }] : []) ],
    ...(rawBody ? { body: { mode: 'raw', raw: rawBody, options: { raw: { language: 'json' } } } } : {}),
    url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.replace(/^\//,'').split('/') }
  }
});
const addResource = (groupName, basePath, sampleCreateBody) => {
  let g = findGroup(groupName);
  if(!g){ g = { name: groupName, item: [] }; collection.item.push(g); }
  // avoid duplicates
  const has = (p)=> g.item.some(it=>it.request && it.request.url && it.request.url.raw===`{{baseUrl}}${p}`);
  if(!has(basePath)) g.item.push(makeReq('GET', null, basePath, `GET ${basePath}`));
  if(!has(basePath)) g.item.push(makeReq('POST', JSON.stringify(sampleCreateBody, null, 2), basePath, `POST ${basePath}`));
  const itemPath = basePath + '/{{created'+groupName.slice(0,-1)+'Id}}';
  if(!has(itemPath)) g.item.push(makeReq('GET', null, itemPath, `GET ${itemPath}`));
  if(!has(itemPath)) g.item.push(makeReq('PUT', JSON.stringify({ example: 'update' }, null, 2), itemPath, `PUT ${itemPath}`));
  if(!has(itemPath)) g.item.push(makeReq('DELETE', null, itemPath, `DELETE ${itemPath}`));
};

// Add Departments PUT/DELETE if group exists
const depts = findGroup('Departments');
if(depts){ const hasPut = depts.item.some(it=>it.name && it.name.startsWith('PUT /api/departments/')); if(!hasPut){ depts.item.push(makeReq('PUT','{\n  "name": "Updated Dept"\n}','/api/departments/{{createdDeptId}}','PUT /api/departments/{{createdDeptId}}')); depts.item.push(makeReq('DELETE',null,'/api/departments/{{createdDeptId}}','DELETE /api/departments/{{createdDeptId}}')); } }

// Add other resources
addResource('Materials','/api/materials',{ name: 'Auto Material', stock_code: 'SC-001' });
addResource('Equipment','/api/equipment',{ name: 'Auto Equipment', equipment_code: 'EQ-001' });
addResource('Specifications','/api/specifications',{ project_id: 1, name: 'Spec' });
addResource('Stages','/api/stages',{ project_id: 1, name: 'Stage 1' });
addResource('Storage','/api/storage',{ bucket_name: 'bucket', object_key: 'file.pdf', storage_type: 'local' });
addResource('Statements','/api/statements',{ document_id: 1, name: 'Statement 1' });

fs.writeFileSync(p, JSON.stringify(collection, null, 2),'utf8');
console.log('Updated postman_collection.json');
