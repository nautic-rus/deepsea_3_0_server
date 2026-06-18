const Storage = require('../../db/models/Storage');
const { hasPermission } = require('./permissionChecker');
const S3Service = require('./s3Service');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { normalizeUploadedFilename } = require('../../utils/textEncoding');

let libredwgPromise = null;

function isDwgFile(file) {
  if (!file) return false;
  const originalName = String(file.originalname || file.original_name || '');
  const mimeType = String(file.mimetype || file.mime_type || '').toLowerCase();
  return /\.dwg$/i.test(originalName) || mimeType.includes('dwg') || mimeType === 'application/acad' || mimeType === 'application/x-acad';
}

function getLibRedwg() {
  if (!libredwgPromise) {
    libredwgPromise = import('@mlightcad/libredwg-web').then((mod) => mod.LibreDwg || mod.default?.LibreDwg || mod.default || mod);
  }
  return libredwgPromise;
}

function ensureDxfFilename(filename, fallbackBaseName) {
  const raw = filename ? String(filename).trim() : '';
  const base = raw || `${fallbackBaseName}.dxf`;
  return /\.dxf$/i.test(base) ? base : `${base.replace(/\.dwg$/i, '')}.dxf`;
}

function normalizeDxfResult(dxf) {
  if (!dxf) return null;
  const buffer = Buffer.isBuffer(dxf)
    ? dxf
    : Buffer.from(dxf instanceof ArrayBuffer ? new Uint8Array(dxf) : dxf);
  return { buffer };
}

async function convertDwgToDxfViaLibrary(file, opts = {}) {
  const normalizedOriginalName = normalizeUploadedFilename(file.originalname);
  const baseName = path.basename(normalizedOriginalName, path.extname(normalizedOriginalName));

  const LibreDwg = await getLibRedwg();
  const libredwg = await LibreDwg.create('./node_modules/@mlightcad/libredwg-web/wasm/');
  const dxf = libredwg.dwg_write_dxf(file.buffer);
  const normalized = normalizeDxfResult(dxf);
  if (!normalized || !normalized.buffer.length) {
    const err = new Error('Failed to convert DWG to DXF. The file may be unsupported, damaged, or use a format not handled by the library.');
    err.statusCode = 502;
    throw err;
  }
  if (normalized.buffer.length < 64) {
    const err = new Error('DWG to DXF conversion produced an unexpectedly small result.');
    err.statusCode = 502;
    throw err;
  }

  return {
    buffer: normalized.buffer,
    filename: ensureDxfFilename(opts.filename, baseName),
    mime: 'application/dxf'
  };
}

/**
 * StorageService
 *
 * Service for storage-related operations (files/objects). Ensures caller has
 * appropriate permissions before calling the Storage model.
 */
class StorageService {
  static async listStorage(query = {}, actor) {
    const requiredPermission = 'storage.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.view'); err.statusCode = 403; throw err; }
    return await Storage.list(query);
  }

  /**
   * Return information needed to stream/download the file for a storage item.
   * Returns { type: 'local', path, filename, mime } or { type: 's3', url, filename }
   */
  static async getFileStreamInfo(id, actor) {
    const s = await StorageService.getStorageById(id, actor);
    // s.object_key is stored as relative path for local files
    if (s.storage_type === 'local') {
      const filePath = path.resolve(process.cwd(), s.object_key);
      try {
        await fs.promises.access(filePath);
      } catch (e) {
        const err = new Error('File not found'); err.statusCode = 404; throw err;
      }
      return { type: 'local', path: filePath, filename: s.file_name || path.basename(filePath), mime: s.mime_type || 'application/octet-stream' };
    }
    if (s.storage_type === 's3') {
      // If we have a public url stored, return it for redirection
      if (s.url) return { type: 's3', url: s.url, filename: s.file_name || 'file' };
      // Otherwise attempt to provide a readable stream from S3 for direct download
      try {
        const stream = await S3Service.getObjectStream({ bucket: s.bucket_name, key: s.object_key });
        return {
          type: 's3',
          stream,
          filename: s.file_name || (s.object_key ? path.basename(s.object_key) : 'file'),
          mime: s.mime_type || 'application/octet-stream'
        };
      } catch (e) {
        const err = new Error('Failed to get S3 object stream'); err.statusCode = 502; throw err;
      }
    }
    const err = new Error('Unsupported storage type'); err.statusCode = 500; throw err;
  }

  static async getStorageById(id, actor) {
    const requiredPermission = 'storage.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Storage.findById(Number(id));
    if (!s) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
    // If S3 object and credentials available, attach a presigned URL for direct access
    try {
      if (s.storage_type === 's3' && s.bucket_name && s.object_key) {
        // Return a presigned URL valid for 30 minutes (1800 seconds)
        const expires = parseInt(process.env.S3_PRESIGNED_EXPIRES || '1800', 10) || 1800;
        try {
          // Build RFC5987 encoded filename for Content-Disposition so browser saves with correct name
          let presigned = null;
          try {
            // Decide disposition: inline for displayable types (images, video, audio, pdf, text), attachment otherwise
            const mt = (s.mime_type || '').toLowerCase();
            const isInline = mt.startsWith('image/') || mt.startsWith('video/') || mt.startsWith('audio/') || mt === 'application/pdf' || mt.startsWith('text/');
            let respDisp = undefined;
            if (s.file_name) {
              const encoded = encodeURIComponent(String(s.file_name));
              respDisp = isInline ? `inline; filename*=UTF-8''${encoded}` : `attachment; filename*=UTF-8''${encoded}`;
            }
            const respType = s.mime_type || undefined;
            presigned = await S3Service.getPresignedUrl({ bucket: s.bucket_name, key: s.object_key, expiresIn: expires, responseContentDisposition: respDisp, responseContentType: respType });
            s.presigned_url = presigned;
            s.presigned_expires_in = expires;
            if (respDisp) s.presigned_content_disposition = respDisp;
            if (respType) s.presigned_content_type = respType;
          } catch (e) {
            // don't fail the request on presign errors; just omit the field
            console.error('Failed to generate presigned URL', e && e.message ? e.message : e);
          }
        } catch (e) {
          // don't fail the request on presign errors; just omit the field
          console.error('Failed to generate presigned URL', e && e.message ? e.message : e);
        }
      }
    } catch (e) {
      // ignore
    }
    return s;
  }

  static async createStorage(fields, actor) {
    const requiredPermission = 'storage.create';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.create'); err.statusCode = 403; throw err; }
    // Backwards-compatible: allow direct DB record creation when bucket_name/object_key are provided.
    if (!fields) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (fields._file) {
      // Upload buffer to S3 then create DB record
      const bucket = fields.bucket_name || process.env.S3_DEFAULT_BUCKET || process.env.YC_S3_BUCKET;
      if (!bucket) { const err = new Error('S3 bucket not configured'); err.statusCode = 500; throw err; }
      const file = fields._file; // { buffer, originalname, mimetype }
      const originalName = normalizeUploadedFilename(file.originalname);
      const uploaded = await S3Service.uploadBuffer({ buffer: file.buffer, originalName, bucket, contentType: file.mimetype });
      const createFields = { bucket_name: uploaded.bucket, object_key: uploaded.key, storage_type: 's3', file_name: originalName, uploaded_by: actor.id };
      const created = await Storage.create(createFields);
      // Optionally attach returned url/size/content_type for API consumers
      return Object.assign({}, created, { url: uploaded.url, size: uploaded.size, content_type: uploaded.content_type });
    }

    if (!fields.bucket_name || !fields.object_key) { const err = new Error('Missing required fields'); err.statusCode = 400; throw err; }
    if (!fields.uploaded_by) fields.uploaded_by = actor.id;
    return await Storage.create(fields);
  }

  static async updateStorage(id, fields, actor) {
    const requiredPermission = 'storage.update';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.update'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const updated = await Storage.update(Number(id), fields);
    if (!updated) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
    return updated;
  }

  static async deleteStorage(id, actor) {
    const requiredPermission = 'storage.delete';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.delete'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    // Find storage item to know bucket/key
    const s = await Storage.findById(Number(id));
    if (!s) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
    try {
      if (s.bucket_name && s.object_key) {
        await S3Service.deleteObject({ bucket: s.bucket_name, key: s.object_key });
      }
    } catch (e) {
      // Log and continue with DB deletion — we don't want to block the API if S3 deletion fails
      console.error('Failed to delete object from S3', e && e.message ? e.message : e);
    }
    const ok = await Storage.softDelete(Number(id));
    if (!ok) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
    return { success: true };
  }

  /**
   * Upload a file buffer to S3 and create a storage DB record in one call.
   * @param {Object} file - { buffer, originalname, mimetype }
   * @param {Object} actor - authenticated user
   * @param {Object} opts - optional { bucket_name }
   */
  static async uploadAndCreate(file, actor, opts = {}) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'storage.create');
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.create'); err.statusCode = 403; throw err; }
    if (!file || !file.buffer || !file.originalname) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
    const bucket = opts.bucket_name || process.env.S3_DEFAULT_BUCKET || process.env.YC_S3_BUCKET;
    if (!bucket) { const err = new Error('S3 bucket not configured'); err.statusCode = 500; throw err; }
    const originalName = normalizeUploadedFilename(file.originalname);
    const uploaded = await S3Service.uploadBuffer({ buffer: file.buffer, originalName, bucket, contentType: file.mimetype, directory: opts.directory || opts.subdir });
    const createFields = { bucket_name: uploaded.bucket, object_key: uploaded.key, storage_type: 's3', file_name: originalName, file_size: uploaded.size, mime_type: uploaded.content_type, uploaded_by: actor.id };
    const created = await Storage.create(createFields);
    return Object.assign({}, created, { url: uploaded.url, size: uploaded.size, content_type: uploaded.content_type });
  }

  /**
   * Convert an uploaded DWG file to DXF using the libredwg WebAssembly library.
   */
  static async convertDwgToDxf(file, actor, opts = {}) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'storage.create');
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.create'); err.statusCode = 403; throw err; }
    if (!file || !file.buffer || !file.originalname) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }
    if (!isDwgFile(file)) { const err = new Error('Only DWG files are supported'); err.statusCode = 400; throw err; }
    return await convertDwgToDxfViaLibrary(file, opts);
  }

  /**
   * Stream multiple storage items as a single ZIP archive to the provided response.
   * Accepts array of storage ids. Supports local files and S3 objects.
   * @param {Array<number>} ids
   * @param {Object} actor
   * @param {object} res - Express response object to stream the ZIP into
   * @param {string} [zipName]
   */
  static async downloadMultipleAsZip(ids = [], actor, res, zipName = 'files.zip') {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'storage.view');
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.view'); err.statusCode = 403; throw err; }
    if (!Array.isArray(ids) || ids.length === 0) { const err = new Error('Missing ids'); err.statusCode = 400; throw err; }

    // Prepare archive and pipe to response
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { res.destroy(err); });
    archive.pipe(res);

    // Stream each file into the archive. If file not found, skip with a warning entry.
    for (const idRaw of ids) {
      const id = Number(idRaw);
      if (!id || Number.isNaN(id)) continue;
      let s;
      try {
        s = await Storage.findById(id);
      } catch (e) { s = null; }
      if (!s) {
        // add small text entry indicating missing file
        archive.append(`Storage item ${id} not found`, { name: `missing-${id}.txt` });
        continue;
      }

      try {
        if (s.storage_type === 'local') {
          const filePath = path.resolve(process.cwd(), s.object_key);
          try {
            await fs.promises.access(filePath);
            const entryName = s.file_name || path.basename(filePath);
            archive.file(filePath, { name: entryName });
          } catch (e) {
            archive.append(`File not found on disk for storage id ${id}`, { name: `missing-${id}.txt` });
          }
        } else if (s.storage_type === 's3') {
          // Use S3Service to get readable stream
          try {
            const stream = await S3Service.getObjectStream({ bucket: s.bucket_name, key: s.object_key });
            const entryName = s.file_name || (s.object_key ? path.basename(s.object_key) : `s3-${id}`);
            archive.append(stream, { name: entryName });
          } catch (e) {
            archive.append(`Failed to download S3 object for storage id ${id}`, { name: `missing-${id}.txt` });
          }
        } else {
          archive.append(`Unsupported storage type for id ${id}`, { name: `missing-${id}.txt` });
        }
      } catch (e) {
        archive.append(`Error processing storage id ${id}: ${e && e.message ? e.message : String(e)}`, { name: `error-${id}.txt` });
      }
    }

    // Finalize archive (returns a Promise in archiver 5.x when using finalize)
    try {
      await archive.finalize();
    } catch (e) {
      // If finalize failed, ensure response is ended
      try { res.end(); } catch (_) {}
    }
  }
}

module.exports = StorageService;
