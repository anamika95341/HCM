const fs = require('fs');
const path = require('path');
const createHttpError = require('http-errors');
const env = require('../../config/env');
const filesService = require('./files.service');

const UPLOAD_BASE = path.resolve(process.cwd(), env.uploadDir);

function resolveLegacyPath(storagePath) {
  if (!storagePath) {
    return null;
  }

  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(UPLOAD_BASE + path.sep)) {
    return null;
  }

  if (!fs.existsSync(resolved)) {
    return null;
  }

  return resolved;
}

function reqMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function createUploadUrl(req, res, next) {
  try {
    const result = await filesService.createUploadUrl({
      actorRole: req.user.role,
      actorId: req.user.sub,
      body: req.body,
      reqMeta: reqMeta(req),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function confirmUpload(req, res, next) {
  try {
    const result = await filesService.confirmUpload({
      actorRole: req.user.role,
      actorId: req.user.sub,
      body: req.body,
      reqMeta: reqMeta(req),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listFiles(req, res, next) {
  try {
    const result = await filesService.listFiles({
      actorRole: req.user.role,
      actorId: req.user.sub,
      query: req.query,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createDownloadUrl(req, res, next) {
  try {
    const result = await filesService.createDownloadUrl({
      fileId: req.params.id,
      actorRole: req.user.role,
      actorId: req.user.sub,
      reqMeta: reqMeta(req),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function accessSignedFile(req, res, next) {
  try {
    const file = await filesService.resolveSignedFileAccess(req.params.fileId, req.query.token);
    const legacyPath = resolveLegacyPath(file.storage_path);

    if (legacyPath) {
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Length', String(file.file_size));
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
      return res.sendFile(legacyPath);
    }

    const { downloadUrl } = await filesService.createStorageDownloadUrl({
      key: file.storage_path,
      filename: file.original_name,
      contentType: file.mime_type,
    });

    if (!downloadUrl) {
      return next(createHttpError(403, 'File not accessible'));
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return res.redirect(302, downloadUrl);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createUploadUrl,
  confirmUpload,
  listFiles,
  createDownloadUrl,
  accessSignedFile,
};
