const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const env = require('../config/env');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const PHOTO_ALLOWED = new Set(['image/jpeg', 'image/png']);

fs.mkdirSync(path.resolve(process.cwd(), env.uploadDir, 'photos'), { recursive: true });
fs.mkdirSync(path.resolve(process.cwd(), env.uploadDir, 'documents'), { recursive: true });

const storage = multer.memoryStorage();

function createUploader({ maxSizeBytes, subdir }) {
  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    async fileFilter(req, file, cb) {
      cb(null, true);
    },
  }).single('file');
}

async function persistPrivateUpload(file, subdir, allowedMimes = ALLOWED) {
  const { fileTypeFromBuffer } = await import('file-type');
  const type = await fileTypeFromBuffer(file.buffer);
  if (!type || !allowedMimes.has(type.mime)) {
    const error = new Error('Invalid file type');
    error.status = 400;
    throw error;
  }

  const ext = type.ext;
  const storedName = `${crypto.randomUUID()}.${ext}`;
  const baseDir = path.resolve(process.cwd(), env.uploadDir, subdir);
  const storagePath = path.join(baseDir, storedName);
  fs.writeFileSync(storagePath, file.buffer);

  return {
    storedName,
    originalName: file.originalname,
    mimeType: type.mime,
    fileSize: file.size,
    storagePath,
  };
}

const deoGrievanceUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) { cb(null, true); },
}).fields([
  { name: 'document', maxCount: 5 },
  { name: 'letterhead', maxCount: 2 },
]);

const deoLetterheadMultiUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) { cb(null, true); },
}).array('file', 2);

module.exports = {
  photoUpload: createUploader({ maxSizeBytes: 2 * 1024 * 1024, subdir: 'photos' }),
  documentUpload: createUploader({ maxSizeBytes: 10 * 1024 * 1024, subdir: 'documents' }),
  deoGrievanceUpload,
  deoLetterheadMultiUpload,
  persistPrivateUpload,
  PHOTO_ALLOWED,
};
