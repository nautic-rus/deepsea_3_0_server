const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs', 'api', 'swagger.json');
const spec = JSON.parse(fs.readFileSync(file,'utf8'));
const schemas = spec.components && spec.components.schemas ? spec.components.schemas : {};
const keys = Object.keys(schemas);
console.log('schemas count =', keys.length);
for (let i=0;i<Math.min(keys.length,200);i++) console.log(i+1, keys[i]);
