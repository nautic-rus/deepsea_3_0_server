// Best-effort fix for common mojibake where UTF-8 bytes were interpreted
// as Latin1/Windows-1252 and then stored as a JS string.
// Example symptoms: "ÐÐÐ..." instead of "ПОД..."
function decodeMaybeLatin1(s) {
  if (!s || typeof s !== 'string') return s;

  // Quick bail-out if the string does not look like mojibake.
  if (!/[ÃÐÂ]/.test(s)) return s;

  const countCyr = (str) => (str.match(/[А-Яа-яЁё]/g) || []).length;
  const candidates = new Map();

  // Try iterative latin1 -> utf8 decoding a few times.
  let cur = s;
  candidates.set(cur, countCyr(cur));
  for (let i = 0; i < 3; i += 1) {
    try {
      cur = Buffer.from(cur, 'latin1').toString('utf8');
      candidates.set(cur, countCyr(cur));
    } catch (e) {
      break;
    }
  }

  // Best-effort cp1251 fallback if iconv-lite is available.
  try {
    // eslint-disable-next-line global-require
    const iconv = require('iconv-lite');
    const buf = Buffer.from(s, 'binary');
    const cp = iconv.decode(buf, 'cp1251');
    candidates.set(cp, countCyr(cp));
  } catch (e) {
    // iconv-lite not installed — skip this branch.
  }

  let best = s;
  let bestScore = candidates.get(s) || 0;
  for (const [cand, score] of candidates.entries()) {
    if (score > bestScore || (score === bestScore && cand.length < best.length)) {
      best = cand;
      bestScore = score;
    }
  }

  return best;
}

function normalizeUploadedFilename(name) {
  if (name === null || typeof name === 'undefined') return name;
  const str = String(name);
  // First pass handles the common "UTF-8 read as Latin1" case.
  const decoded = decodeMaybeLatin1(str);
  // Remove null bytes and trim stray whitespace around the name.
  return String(decoded).replace(/\0/g, '').trim();
}

module.exports = {
  decodeMaybeLatin1,
  normalizeUploadedFilename
};
