const crypto = require('crypto');
const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const filesRepository = require('./files.repository');
const complaintsRepository = require('../complaints/complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const storageService = require('../../services/storageService');
const logger = require('../../utils/logger');
const { writeAuditLog } = require('../../utils/audit');
const {
  UPLOADER_ROLES,
  VIEWER_ROLES,
  mapMimeToCategory,
  getMaxSizeForRole,
  getVisibleToRole,
  buildS3Key,
  buildDuplicateFingerprint,
} = require('./files.policy');

const SIGNED_FILE_TTL_SECONDS = 300;
const UPLOAD_INTENT_TTL_SECONDS = 900;
const DUPLICATE_UPLOAD_TTL_SECONDS = 300;

function getUploadAuditTarget({ actorId, contextType, contextId }) {
  if (contextType === 'meeting' && contextId) {
    return {
      entityType: 'meeting',
      entityId: contextId,
    };
  }

  if (contextType === 'complaint' && contextId) {
    return {
      entityType: 'complaint',
      entityId: contextId,
    };
  }

  if (contextType === 'event' && contextId) {
    return {
      entityType: 'minister_calendar_event',
      entityId: contextId,
    };
  }

  return {
    entityType: 'user',
    entityId: actorId,
  };
}

async function createSignedFileAccess({ fileId, actorRole, actorId, scope = {} }) {
  const token = crypto.randomUUID();
  await redis.set(
    `signed-file:${token}`,
    JSON.stringify({
      fileId,
      actorRole,
      actorId,
      scope,
    }),
    'EX',
    SIGNED_FILE_TTL_SECONDS,
  );

  return {
    token,
    expiresInSeconds: SIGNED_FILE_TTL_SECONDS,
    url: `/api/v1/files/access/${fileId}?token=${encodeURIComponent(token)}`,
  };
}

async function resolveSignedFileAccess(fileId, token) {
  if (!token) {
    throw createHttpError(401, 'Missing file access token');
  }

  const raw = await redis.get(`signed-file:${token}`);
  if (!raw) {
    throw createHttpError(401, 'File access token expired');
  }

  const payload = JSON.parse(raw);
  if (payload.fileId !== fileId) {
    throw createHttpError(403, 'Invalid file access token');
  }

  const file = await filesRepository.findUploadedFileById(fileId);
  if (!file) {
    throw createHttpError(404, 'File not found');
  }

  return file;
}

async function assertLegacyFileViewerAccess(file, actorRole, actorId) {
  if (actorRole === 'citizen') {
    if (file.entity_type === 'meeting_document') {
      const meeting = await meetingsRepository.getCitizenMeetingById(file.entity_id, actorId);
      if (!meeting) {
        throw createHttpError(404, 'File not found');
      }
      return;
    }

    if (file.entity_type === 'complaint_document') {
      const complaint = await complaintsRepository.getCitizenComplaintById(file.entity_id, actorId);
      if (!complaint) {
        throw createHttpError(404, 'File not found');
      }
      return;
    }

    throw createHttpError(404, 'File not found');
  }

  if (actorRole === 'admin') {
    if (file.entity_type === 'meeting_document' || file.entity_type === 'meeting_photo') {
      const meeting = await meetingsRepository.getMeetingById(file.entity_id);
      if (!meeting) {
        throw createHttpError(404, 'File not found');
      }
      const canAccessMeeting = meeting.assignedAdminUserId === actorId
        || (!meeting.assignedAdminUserId && meeting.status === 'pending');
      if (!canAccessMeeting) {
        throw createHttpError(404, 'File not found');
      }
      return;
    }

    if (file.entity_type === 'complaint_document') {
      const complaint = await complaintsRepository.getComplaintById(file.entity_id);
      if (!complaint) {
        throw createHttpError(404, 'File not found');
      }
      const canAccessComplaint = complaint.assignedAdminUserId === actorId
        || (!complaint.assignedAdminUserId && complaint.status === 'submitted');
      if (!canAccessComplaint) {
        throw createHttpError(404, 'File not found');
      }
      return;
    }

    throw createHttpError(404, 'File not found');
  }

  if (actorRole === 'minister') {
    if (file.entity_type !== 'meeting_document' && file.entity_type !== 'meeting_photo') {
      throw createHttpError(404, 'File not found');
    }
    const allowed = await canMinisterAccessFile({
      context_type: 'meeting',
      context_id: file.entity_id,
      visible_to_role: 'minister',
      uploader_role: 'deo',
    }, actorId);
    if (!allowed) {
      throw createHttpError(404, 'File not found');
    }
    return;
  }

  throw createHttpError(403, 'Forbidden');
}

function uploadIntentKey(s3Key) {
  return `files:intent:${s3Key}`;
}

function uploadAttemptKey(actorRole, actorId) {
  return `files:attempts:${actorRole}:${actorId}`;
}

function duplicateUploadKey(fingerprint) {
  return `files:duplicate:${fingerprint}`;
}

function assertUploaderRole(role) {
  if (!UPLOADER_ROLES.includes(role)) {
    throw createHttpError(403, 'Only citizen and DEO users can upload files');
  }
}

function assertViewerRole(role) {
  if (!VIEWER_ROLES.includes(role)) {
    throw createHttpError(403, 'Only admin and minister users can view files');
  }
}

function validateUploadPolicy(role, mimeType, size) {
  const category = mapMimeToCategory(mimeType);
  if (!category) {
    throw createHttpError(400, 'Unsupported MIME type');
  }

  const maxSize = getMaxSizeForRole(role, category);
  if (!maxSize) {
    throw createHttpError(400, `${category} uploads are not allowed for ${role}`);
  }

  if (size > maxSize) {
    throw createHttpError(400, `${category} exceeds the ${Math.round(maxSize / (1024 * 1024))}MB limit for ${role}`);
  }

  return category;
}

async function trackUploadAttempt(actorRole, actorId) {
  try {
    const key = uploadAttemptKey(actorRole, actorId);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 3600);
    }
    return count;
  } catch (error) {
    logger.warn('Unable to track upload attempt', {
      actorRole,
      actorId,
      error: error.message,
    });
    return null;
  }
}

async function assertContextAccess({ actorRole, actorId, contextType, contextId }) {
  if (contextType === 'general') {
    return;
  }

  if (!contextId) {
    throw createHttpError(400, 'contextId is required for contextual uploads');
  }

  if (actorRole === 'citizen') {
    if (!['meeting', 'complaint'].includes(contextType)) {
      throw createHttpError(400, 'Citizens can only upload files in meeting, complaint, or general context');
    }

    if (contextType === 'meeting') {
      const meeting = await filesRepository.getCitizenMeetingById(contextId, actorId);
      if (!meeting) {
        throw createHttpError(403, 'You cannot upload files for this meeting');
      }
      return;
    }

    const complaint = await filesRepository.getCitizenComplaintById(contextId, actorId);
    if (!complaint) {
      throw createHttpError(403, 'You cannot upload files for this complaint');
    }
    return;
  }

  if (actorRole === 'deo' && contextType === 'meeting') {
    const meeting = await filesRepository.getAssignedMeetingForDeo(contextId, actorId);
    if (!meeting) {
      throw createHttpError(403, 'You cannot upload files for this meeting');
    }
    return;
  }

  if (actorRole === 'deo' && contextType === 'event') {
    const event = await filesRepository.getDeoCalendarEventById(contextId, actorId);
    if (!event) {
      throw createHttpError(403, 'You cannot upload files for this event');
    }
    return;
  }

  throw createHttpError(400, 'Unsupported upload context');
}

async function createUploadUrl({ actorRole, actorId, body, reqMeta }) {
  assertUploaderRole(actorRole);
  const fileCategory = validateUploadPolicy(actorRole, body.mimeType, body.size);
  await assertContextAccess({
    actorRole,
    actorId,
    contextType: body.contextType,
    contextId: body.contextId || null,
  });
  await trackUploadAttempt(actorRole, actorId);

  const duplicateFingerprint = buildDuplicateFingerprint({
    actorRole,
    actorId,
    fileName: body.fileName,
    mimeType: body.mimeType,
    size: body.size,
    contextType: body.contextType,
    contextId: body.contextId || null,
  });

  const duplicateKey = duplicateUploadKey(duplicateFingerprint);
  const duplicateLock = await redis.set(
    duplicateKey,
    '1',
    'EX',
    DUPLICATE_UPLOAD_TTL_SECONDS,
    'NX',
  );

  if (duplicateLock !== 'OK') {
    logger.warn('Duplicate upload blocked', {
      actorRole,
      actorId,
      contextType: body.contextType,
      contextId: body.contextId || null,
      fileName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
      ip: reqMeta.ip,
    });
    throw createHttpError(409, 'Duplicate upload attempt blocked');
  }

  const s3Key = buildS3Key({
    role: actorRole,
    userId: actorId,
    mimeType: body.mimeType,
    originalName: body.fileName,
  });

  const intent = {
    s3Key,
    uploadedBy: actorId,
    uploaderRole: actorRole,
    visibleToRole: getVisibleToRole(actorRole),
    originalName: body.fileName,
    mimeType: body.mimeType,
    fileCategory,
    size: body.size,
    contextType: body.contextType,
    contextId: body.contextId || null,
    duplicateKey,
  };

  await redis.set(uploadIntentKey(s3Key), JSON.stringify(intent), 'EX', UPLOAD_INTENT_TTL_SECONDS);

  const upload = await storageService.generateUploadUrl({
    key: s3Key,
    contentType: body.mimeType,
    metadata: {
      uploaderrole: actorRole,
      uploaderid: actorId,
      contexttype: body.contextType,
    },
  });

  const auditTarget = getUploadAuditTarget({
    actorId,
    contextType: body.contextType,
    contextId: body.contextId || null,
  });

  await writeAuditLog({
    actorRole,
    actorId,
    entityType: auditTarget.entityType,
    entityId: auditTarget.entityId,
    action: 'file_upload_url_generated',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: {
      s3Key,
      contextType: body.contextType,
      contextId: body.contextId || null,
      fileCategory,
    },
  });

  return {
    uploadUrl: upload.uploadUrl,
    s3Key,
    expiresInSeconds: upload.expiresIn,
  };
}

async function confirmUpload({ actorRole, actorId, body, reqMeta }) {
  assertUploaderRole(actorRole);

  const rawIntent = await redis.get(uploadIntentKey(body.s3Key));
  if (!rawIntent) {
    throw createHttpError(400, 'Upload intent expired or not found');
  }

  const intent = JSON.parse(rawIntent);
  if (intent.uploadedBy !== actorId || intent.uploaderRole !== actorRole) {
    logger.warn('Suspicious upload confirmation blocked', {
      actorRole,
      actorId,
      s3Key: body.s3Key,
      ip: reqMeta.ip,
    });
    throw createHttpError(403, 'Upload confirmation is not allowed');
  }

  const existing = await filesRepository.findFileByS3Key(body.s3Key);
  if (existing) {
    await redis.del(uploadIntentKey(body.s3Key));
    throw createHttpError(409, 'File already confirmed');
  }

  let head;
  try {
    head = await storageService.headObject({ key: body.s3Key });
  } catch (error) {
    logger.warn('File confirmation failed because object was not found', {
      actorRole,
      actorId,
      s3Key: body.s3Key,
      error: error.message,
    });
    throw createHttpError(400, 'Uploaded object not found');
  }

  if (Number(head.ContentLength || 0) !== intent.size) {
    logger.warn('Suspicious upload size mismatch', {
      actorRole,
      actorId,
      s3Key: body.s3Key,
      expectedSize: intent.size,
      actualSize: Number(head.ContentLength || 0),
      ip: reqMeta.ip,
    });
    throw createHttpError(400, 'Uploaded object size mismatch');
  }

  if (head.ContentType && head.ContentType !== intent.mimeType) {
    logger.warn('Suspicious upload MIME mismatch', {
      actorRole,
      actorId,
      s3Key: body.s3Key,
      expectedMimeType: intent.mimeType,
      actualMimeType: head.ContentType,
      ip: reqMeta.ip,
    });
    throw createHttpError(400, 'Uploaded object MIME type mismatch');
  }

  const file = await filesRepository.createFile({
    s3Key: intent.s3Key,
    uploadedBy: actorId,
    uploaderRole: actorRole,
    visibleToRole: intent.visibleToRole,
    originalName: intent.originalName,
    mimeType: intent.mimeType,
    fileCategory: intent.fileCategory,
    size: intent.size,
    contextType: intent.contextType,
    contextId: intent.contextId,
    status: 'pending',
  });

  await redis.del(uploadIntentKey(body.s3Key));

  await writeAuditLog({
    actorRole,
    actorId,
    entityType: 'file',
    entityId: file.id,
    action: 'file_upload_confirmed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: {
      s3Key: file.s3_key,
      contextType: file.context_type,
      contextId: file.context_id,
      visibleToRole: file.visible_to_role,
    },
  });

  return { file };
}

async function canMinisterAccessFile(file, ministerId) {
  if (file.context_type === 'meeting' && file.context_id) {
    return filesRepository.hasMinisterMeetingAccess(file.context_id, ministerId);
  }
  if (file.context_type === 'event' && file.context_id) {
    return filesRepository.hasMinisterEventAccess(file.context_id, ministerId);
  }
  return true;
}

async function assertFileViewerAccess(file, actorRole, actorId) {
  assertViewerRole(actorRole);

  if (actorRole === 'admin') {
    if (file.visible_to_role !== 'admin' || file.uploader_role !== 'citizen') {
      throw createHttpError(404, 'File not found');
    }
    return;
  }

  if (actorRole === 'minister') {
    if (file.visible_to_role !== 'minister' || file.uploader_role !== 'deo') {
      throw createHttpError(404, 'File not found');
    }
    const allowed = await canMinisterAccessFile(file, actorId);
    if (!allowed) {
      throw createHttpError(404, 'File not found');
    }
    return;
  }

  throw createHttpError(403, 'Forbidden');
}

function mapFileResponse(file) {
  return {
    id: file.id,
    s3Key: file.s3_key,
    name: file.original_name,
    mimeType: file.mime_type,
    fileCategory: file.file_category,
    size: Number(file.size),
    contextType: file.context_type,
    contextId: file.context_id,
    status: file.status,
    uploadedBy: file.uploaded_by,
    uploaderRole: file.uploader_role,
    visibleToRole: file.visible_to_role,
    createdAt: file.created_at,
  };
}

function assertOwnedFileAccess(file, actorRole, actorId) {
  if (!file || file.uploader_role !== actorRole || file.uploaded_by !== actorId) {
    throw createHttpError(404, 'File not found');
  }
}

async function listFiles({ actorRole, actorId, query = {} }) {
  assertViewerRole(actorRole);

  const files = await filesRepository.listFilesVisibleToRole(actorRole, query);
  const visibleFiles = [];

  for (const file of files) {
    try {
      await assertFileViewerAccess(file, actorRole, actorId);
      visibleFiles.push(mapFileResponse(file));
    } catch (error) {
      if (error.statusCode === 404 || error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  return { files: visibleFiles };
}

async function createDownloadUrl({ fileId, actorRole, actorId, reqMeta }) {
  assertViewerRole(actorRole);
  const file = await filesRepository.findFileRecordById(fileId);
  if (!file) {
    throw createHttpError(404, 'File not found');
  }

  await assertFileViewerAccess(file, actorRole, actorId);

  const signed = await storageService.generateDownloadUrl({
    key: file.s3_key,
    filename: file.original_name,
    contentType: file.mime_type,
  });

  await writeAuditLog({
    actorRole,
    actorId,
    entityType: 'file',
    entityId: file.id,
    action: 'file_download_url_generated',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: {
      s3Key: file.s3_key,
      contextType: file.context_type,
      contextId: file.context_id,
    },
  });

  return {
    downloadUrl: signed.downloadUrl,
    expiresInSeconds: signed.expiresIn,
    file: mapFileResponse(file),
  };
}

async function createOwnerDownloadUrl({ fileId, actorRole, actorId, reqMeta }) {
  const file = await filesRepository.findFileRecordById(fileId);
  if (!file) {
    throw createHttpError(404, 'File not found');
  }

  assertOwnedFileAccess(file, actorRole, actorId);

  const signed = await storageService.generateDownloadUrl({
    key: file.s3_key,
    filename: file.original_name,
    contentType: file.mime_type,
  });

  await writeAuditLog({
    actorRole,
    actorId,
    entityType: 'file',
    entityId: file.id,
    action: 'owned_file_download_url_generated',
    ipAddress: reqMeta?.ip || null,
    userAgent: reqMeta?.userAgent || null,
    metadata: {
      s3Key: file.s3_key,
      contextType: file.context_type,
      contextId: file.context_id,
    },
  });

  return {
    downloadUrl: signed.downloadUrl,
    expiresInSeconds: signed.expiresIn,
    file: mapFileResponse(file),
  };
}

async function listOwnedFiles({ actorRole, actorId, contextType, contextId, reqMeta }) {
  const files = await filesRepository.listFilesUploadedByActor(actorRole, actorId, {
    contextType,
    contextId,
  });

  return Promise.all(files.map(async (file) => {
    const owned = await createOwnerDownloadUrl({
      fileId: file.id,
      actorRole,
      actorId,
      reqMeta,
    });
    return {
      ...owned.file,
      downloadUrl: owned.downloadUrl,
    };
  }));
}

async function createLegacyDownloadAccess({ fileId, actorRole, actorId, reqMeta, scope = {} }) {
  const file = await filesRepository.findUploadedFileById(fileId);
  if (!file) {
    throw createHttpError(404, 'File not found');
  }

  await assertLegacyFileViewerAccess(file, actorRole, actorId);
  const signed = await createSignedFileAccess({
    fileId,
    actorRole,
    actorId,
    scope,
  });

  await writeAuditLog({
    actorRole,
    actorId,
    entityType: 'file',
    entityId: file.id,
    action: 'legacy_file_download_url_generated',
    ipAddress: reqMeta?.ip || null,
    userAgent: reqMeta?.userAgent || null,
    metadata: {
      storagePath: file.storage_path,
      entityType: file.entity_type,
      entityId: file.entity_id,
    },
  });

  return {
    downloadUrl: signed.url,
    expiresInSeconds: signed.expiresInSeconds,
    file: {
      id: file.id,
      name: file.original_name,
      mimeType: file.mime_type,
      size: Number(file.file_size),
      kind: file.entity_type,
      createdAt: file.created_at,
    },
  };
}

async function createStorageUploadUrl({ key, contentType, metadata, expiresIn }) {
  return storageService.generateUploadUrl({
    key,
    contentType,
    metadata,
    expiresIn,
  });
}

async function createStorageDownloadUrl({ key, filename, contentType, expiresIn }) {
  return storageService.generateDownloadUrl({
    key,
    filename,
    contentType,
    expiresIn,
  });
}

module.exports = {
  createSignedFileAccess,
  createUploadUrl,
  confirmUpload,
  listFiles,
  createDownloadUrl,
  createOwnerDownloadUrl,
  listOwnedFiles,
  createLegacyDownloadAccess,
  createStorageUploadUrl,
  createStorageDownloadUrl,
  resolveSignedFileAccess,
  validateUploadPolicy,
};
