const path = require('path');
const crypto = require('crypto');

const FILE_CATEGORY_BY_MIME = Object.freeze({
  'application/pdf': 'document',
  'image/jpeg': 'image',
  'image/png': 'image',
  'video/mp4': 'video',
  'video/mpeg': 'video',
  'video/webm': 'video',
});

const FILE_EXTENSION_BY_MIME = Object.freeze({
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'video/mp4': '.mp4',
  'video/mpeg': '.mpeg',
  'video/webm': '.webm',
});

const ROLE_UPLOAD_LIMITS = Object.freeze({
  citizen: Object.freeze({
    document: 5 * 1024 * 1024,
    image: 5 * 1024 * 1024,
  }),
  deo: Object.freeze({
    document: 5 * 1024 * 1024,
    image: 20 * 1024 * 1024,
    video: 100 * 1024 * 1024,
  }),
});

const CONTEXT_TYPES = Object.freeze(['meeting', 'complaint', 'event', 'general']);
const VIEWER_ROLES = Object.freeze(['admin', 'minister']);
const UPLOADER_ROLES = Object.freeze(['citizen', 'deo']);

function mapMimeToCategory(mimeType) {
  return FILE_CATEGORY_BY_MIME[mimeType] || null;
}

function getMaxSizeForRole(role, category) {
  return ROLE_UPLOAD_LIMITS[role]?.[category] || null;
}

function getVisibleToRole(role) {
  if (role === 'citizen') return 'admin';
  if (role === 'deo') return 'minister';
  return null;
}

function getS3PrefixForRole(role, userId) {
  return `${role}/${userId}`;
}

function getFileExtension(mimeType, originalName = '') {
  const mapped = FILE_EXTENSION_BY_MIME[mimeType];
  if (mapped) {
    return mapped;
  }

  const ext = path.extname(originalName).toLowerCase();
  return ext || '';
}

function buildS3Key({ role, userId, mimeType, originalName }) {
  const extension = getFileExtension(mimeType, originalName);
  return `${getS3PrefixForRole(role, userId)}/${crypto.randomUUID()}${extension}`;
}

function buildDuplicateFingerprint({ actorRole, actorId, fileName, mimeType, size, contextType, contextId }) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      actorRole,
      actorId,
      fileName,
      mimeType,
      size,
      contextType,
      contextId: contextId || null,
    }))
    .digest('hex');
}

module.exports = {
  CONTEXT_TYPES,
  FILE_CATEGORY_BY_MIME,
  FILE_EXTENSION_BY_MIME,
  ROLE_UPLOAD_LIMITS,
  UPLOADER_ROLES,
  VIEWER_ROLES,
  mapMimeToCategory,
  getMaxSizeForRole,
  getVisibleToRole,
  getS3PrefixForRole,
  buildS3Key,
  buildDuplicateFingerprint,
};
