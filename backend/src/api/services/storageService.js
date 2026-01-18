const Storage = require('../../db/models/Storage');
const { hasPermission } = require('./permissionChecker');
const S3Service = require('./s3Service');
const fs = require('fs');
const path = require('path');
const storageConfig = require('../../config/storage');

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

  static async getStorageById(id, actor) {
    const requiredPermission = 'storage.view';
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, requiredPermission);
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.view'); err.statusCode = 403; throw err; }
    if (!id || Number.isNaN(Number(id))) { const err = new Error('Invalid id'); err.statusCode = 400; throw err; }
    const s = await Storage.findById(Number(id));
    if (!s) { const err = new Error('Storage item not found'); err.statusCode = 404; throw err; }
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
      const uploaded = await S3Service.uploadBuffer({ buffer: file.buffer, originalName: file.originalname, bucket, contentType: file.mimetype });
      const createFields = { bucket_name: uploaded.bucket, object_key: uploaded.key, storage_type: 's3', uploaded_by: actor.id };
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
    const uploaded = await S3Service.uploadBuffer({ buffer: file.buffer, originalName: file.originalname, bucket, contentType: file.mimetype });
    const createFields = { bucket_name: uploaded.bucket, object_key: uploaded.key, storage_type: 's3', file_name: file.originalname, file_size: uploaded.size, mime_type: uploaded.content_type, uploaded_by: actor.id };
    const created = await Storage.create(createFields);
    return Object.assign({}, created, { url: uploaded.url, size: uploaded.size, content_type: uploaded.content_type });
  }

  /**
   * Save file to local uploads directory and create storage DB record.
   * @param {Object} file - multer file object { buffer, originalname, mimetype }
   * @param {Object} actor - authenticated user
   * @param {Object} opts - { subdir }
   */
  static async uploadToLocalAndCreate(file, actor, opts = {}) {
    if (!actor || !actor.id) { const err = new Error('Authentication required'); err.statusCode = 401; throw err; }
    const allowed = await hasPermission(actor, 'storage.create');
    if (!allowed) { const err = new Error('Forbidden: missing permission storage.create'); err.statusCode = 403; throw err; }
    if (!file || !file.buffer || !file.originalname) { const err = new Error('Missing file'); err.statusCode = 400; throw err; }

    const uploadsRoot = path.resolve(process.cwd(), 'backend', 'uploads');
    const subdir = opts.subdir ? String(opts.subdir).replace(/[^a-zA-Z0-9_\-\/]/g, '') : '';
    const targetDir = subdir ? path.join(uploadsRoot, subdir) : uploadsRoot;
    await fs.promises.mkdir(targetDir, { recursive: true });
    const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);
    const relativePath = path.relative(process.cwd(), filePath);
    // Build a public URL using configured mount path (e.g. /backend/uploads)
    const relativeToUploads = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
    const mount = (storageConfig && storageConfig.mountPath) ? storageConfig.mountPath.replace(/\/$/, '') : '/backend/uploads';
    const publicUrl = `${mount}/${relativeToUploads}`;
    const stat = await fs.promises.stat(filePath);
    const createFields = {
      url: publicUrl,
      bucket_name: null,
      object_key: relativePath,
      file_name: file.originalname,
      file_size: stat.size,
      mime_type: file.mimetype || 'application/octet-stream',
      storage_type: 'local',
      uploaded_by: actor.id
    };
    const created = await Storage.create(createFields);
    return Object.assign({}, created, { url: createFields.url, size: createFields.file_size, content_type: createFields.mime_type });
  }
}

module.exports = StorageService;
