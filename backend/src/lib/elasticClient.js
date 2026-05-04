const { Client } = require('@elastic/elasticsearch');

const ELASTIC_INDEX = process.env.ELASTIC_INDEX || 'deepsea_search';

function createClient() {
  const node = process.env.ELASTIC_URL || 'http://localhost:9200';
  const username = process.env.ELASTIC_USERNAME || process.env.ELASTIC_USER || null;
  const password = process.env.ELASTIC_PASSWORD || process.env.ELASTIC_PASS || null;

  const opts = { node };
  if (username && password) opts.auth = { username, password };

  return new Client(opts);
}

const client = createClient();

async function indexExists(index = ELASTIC_INDEX) {
  try {
    const { body } = await client.indices.exists({ index });
    return body === true || body === undefined ? !!body : body;
  } catch (err) {
    return false;
  }
}

async function ensureIndex(mapping = {}, index = ELASTIC_INDEX) {
  const exists = await indexExists(index);
  if (exists) return;
  // Default mapping: only index the minimal set of fields requested by config
  const body = {
    mappings: mapping.mappings || mapping || {
      dynamic: false,
      properties: {
        id: { type: 'keyword' },
        entity_type: { type: 'keyword' },
        project_id_text: { type: 'keyword' },
        title: { type: 'text' },
        description: { type: 'text' },
        code: { type: 'text' },
        comment: { type: 'text' },
        messages_text: { type: 'text' },
        files_text: { type: 'text' }
      }
    }
  };
  try {
    await client.indices.create({ index, body });
  } catch (err) {
    // ignore race where index was created concurrently
    const errType = err && err.meta && err.meta.body && err.meta.body.error && err.meta.body.error.type;
    if (errType === 'resource_already_exists_exception') return;
    throw err;
  }
}

async function bulkIndex(docs = [], index = ELASTIC_INDEX, chunkSize = 500) {
  if (!docs || !docs.length) return;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const body = [];
    for (const doc of chunk) {
      // Only index the selected fields to keep index minimal
      const docBody = {
        id: doc.id,
        entity_type: doc.entity_type || '',
        project_id_text: doc.project_id_text || '',
        title: doc.title || '',
        description: doc.description || '',
        code: doc.code || '',
        comment: doc.comment || '',
        messages_text: doc.messages_text || '',
        files_text: doc.files_text || ''
      };
      body.push({ index: { _index: index, _id: doc.id } });
      body.push(docBody);
    }
    await client.bulk({ refresh: true, body });
  }
}

async function search(index = ELASTIC_INDEX, body) {
  const res = await client.search({ index, body });
  return res.body || res;
}

module.exports = {
  client,
  ensureIndex,
  bulkIndex,
  search,
  ELASTIC_INDEX
};
