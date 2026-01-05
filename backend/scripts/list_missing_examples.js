const path = require('path');
const s = require(path.join(__dirname, '../docs/api/swagger.json'));
const missing = [];
Object.keys(s.paths || {}).forEach(p => {
  ['post','put'].forEach(m => {
    const op = s.paths[p][m];
    if (op) {
      const has = op.requestBody && op.requestBody.content && op.requestBody.content['application/json'] && op.requestBody.content['application/json'].example;
      if (!has) missing.push(m.toUpperCase() + ' ' + p);
    }
  });
});
console.log('missing examples count:', missing.length);
missing.forEach(x => console.log(x));
