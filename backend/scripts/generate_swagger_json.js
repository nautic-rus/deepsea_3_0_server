const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function main() {
  try {
    const root = path.join(__dirname, '..');
    const inPath = path.join(root, 'docs', 'api', 'swagger.yaml');
    const outPath = path.join(root, 'docs', 'api', 'swagger.json');
    const content = fs.readFileSync(inPath, 'utf8');
    const obj = yaml.load(content);
    fs.writeFileSync(outPath, JSON.stringify(obj, null, 2), 'utf8');
    console.log('Wrote', outPath);
  } catch (err) {
    console.error('Failed to generate swagger.json:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();
