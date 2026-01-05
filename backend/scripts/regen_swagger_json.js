const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const inPath = path.join(__dirname, '../docs/api/swagger.yaml');
const outPath = path.join(__dirname, '../docs/api/swagger.json');
if (!fs.existsSync(inPath)) {
  console.error('Missing', inPath);
  process.exit(2);
}
const content = fs.readFileSync(inPath, 'utf8');
const obj = yaml.load(content);
fs.writeFileSync(outPath, JSON.stringify(obj, null, 2));
console.log('WROTE', outPath);
