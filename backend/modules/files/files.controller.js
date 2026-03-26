const path = require('path');
const createHttpError = require('http-errors');
const env = require('../../config/env');
const filesService = require('./files.service');

const UPLOAD_BASE = path.resolve(process.cwd(), env.uploadDir);

async function accessSignedFile(req, res, next) {
  try {
    const file = await filesService.resolveSignedFileAccess(req.params.fileId, req.query.token);

    const resolved = path.resolve(file.storage_path);
    if (!resolved.startsWith(UPLOAD_BASE + path.sep)) {
      return next(createHttpError(403, 'File not accessible'));
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', String(file.file_size));
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
    return res.sendFile(resolved);
  } catch (error) {
    return next(error);
  }
}

module.exports = { accessSignedFile };
