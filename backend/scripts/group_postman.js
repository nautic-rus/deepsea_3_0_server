const fs = require('fs');
const swaggerPath = './docs/api/swagger.json';
const postmanPath = './docs/api/postman_collection.json';
if (!fs.existsSync(swaggerPath) || !fs.existsSync(postmanPath)) {
  console.error('Missing files:', !fs.existsSync(swaggerPath) ? swaggerPath : '', !fs.existsSync(postmanPath) ? postmanPath : '');
  process.exit(2);
}
const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
const pm = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));
const paths = swagger.paths || {};
const pathTags = {};
Object.keys(paths).forEach(p => {
  const ops = paths[p];
  Object.keys(ops).forEach(op => {
    const tags = ops[op].tags;
    if (Array.isArray(tags) && tags.length > 0) {
      pathTags[p] = pathTags[p] || new Set();
      pathTags[p].add(tags[0]);
    }
  });
});

const tagBuckets = {};
const unc = [];
(pm.item || []).forEach(it => {
  const urlRaw = (it.request && it.request.url && (it.request.url.raw || it.request.url)) || '';
  let matchedTag = null;
  for (const p of Object.keys(pathTags)) {
    if (urlRaw && urlRaw.indexOf(p) !== -1) {
      matchedTag = Array.from(pathTags[p])[0];
      break;
    }
  }
  if (matchedTag) {
    tagBuckets[matchedTag] = tagBuckets[matchedTag] || [];
    tagBuckets[matchedTag].push(it);
  } else {
    unc.push(it);
  }
});

const grouped = Object.assign({}, pm);
const folderItems = [];
Object.keys(tagBuckets).sort().forEach(tag => {
  folderItems.push({ name: tag, item: tagBuckets[tag] });
});
if (unc.length > 0) folderItems.push({ name: 'Uncategorized', item: unc });
grouped.item = folderItems;
const outPath = './docs/api/postman_collection.grouped.json';
fs.writeFileSync(outPath, JSON.stringify(grouped, null, 2));
console.log('WROTE', outPath);
console.log('TAGS', Object.keys(tagBuckets).map(t => ({ tag: t, count: tagBuckets[t].length })));
console.log('UNCAT', unc.length);
