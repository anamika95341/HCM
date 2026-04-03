const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const meetingsRepository = require('./meetings.repository');
const adminRepository = require('../admin/admin.repository');
const { sanitizeText } = require('../../utils/sanitize');
const { persistPrivateUpload, PHOTO_ALLOWED } = require('../../middleware/uploadHandler');
const { writeAuditLog } = require('../../utils/audit');
const { publishMeetingStatusUpdate } = require('../../realtime/wsPublisher');
const { generateCaseCode } = require('../../utils/generateCaseCode');
const logger = require('../../utils/logger');
const { claimIdempotency, storeIdempotencyResult, clearIdempotency } = require('../../utils/idempotency');

function assertAllowedTransition(currentStatus, allowedStatuses, actionLabel) {
  if (!allowedStatuses.includes(currentStatus)) {
    throw createHttpError(409, `Cannot ${actionLabel} when meeting status is ${currentStatus}`);
  }
}

function assertMeetingAdminAccess(meeting, adminId, { allowUnassigned = false, actionLabel = 'modify this meeting' } = {}) {
  if (!meeting.assignedAdminUserId) {
    if (allowUnassigned) {
      return;
    }
    throw createHttpError(409, `Cannot ${actionLabel} because the meeting is not assigned`);
  }
  if (meeting.assignedAdminUserId !== adminId) {
    throw createHttpError(403, 'Only the assigned admin can perform this action');
  }
}

function assertAssignedDeo(meeting, deoId) {
  if (!meeting.assignedDeoId) {
    throw createHttpError(409, 'This meeting is not assigned to a DEO');
  }
  if (meeting.assignedDeoId !== deoId) {
    throw createHttpError(403, 'Only the assigned DEO can verify this meeting');
  }
}

async function submitMeetingRequest({ citizenId, body, file, reqMeta, idempotencyKey }) {
  const claim = await claimIdempotency(redis, {
    scope: 'meeting_submission',
    explicitKey: idempotencyKey,
    actorId: citizenId,
    body,
    file,
    payload: body,
  });
  if (claim.existing && !claim.existing.pending) {
    logger.info('Returning cached meeting submission response', {
      citizenId,
      keySource: claim.source,
    });
    return claim.existing;
  }

  try {
    let assignedAdminId = null;
    if (body.referralAdminUserId) {
      const admin = await adminRepository.findActiveAdminById(body.referralAdminUserId);
      if (!admin) {
        throw createHttpError(400, 'Selected admin desk is not available');
      }
      assignedAdminId = admin.id;
    }

    let document = null;
    if (file) {
      const storedFile = await persistPrivateUpload(file, 'documents');
      document = await meetingsRepository.createUploadedFile(storedFile, {
        entityType: 'meeting_document',
        uploadedByRole: 'citizen',
        uploadedById: citizenId,
      });
    }

    const createdMeeting = await meetingsRepository.createMeeting({
      citizenId,
      title: sanitizeText(body.title),
      purpose: sanitizeText(body.purpose),
      preferredTime: body.preferredTime || null,
      adminReferral: sanitizeText(body.adminReferral || ''),
      assignedAdminId,
      documentFileId: document?.id,
      additionalAttendees: body.additionalAttendees || [],
    });
    const meeting = await meetingsRepository.getMeetingById(createdMeeting.id) || createdMeeting;

    await writeAuditLog({
      actorRole: 'citizen',
      actorId: citizenId,
      entityType: 'meeting',
      entityId: meeting.id,
      action: 'meeting_submitted',
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    const result = { meeting };
    await storeIdempotencyResult(redis, claim, result);
    return result;
  } catch (error) {
    await clearIdempotency(redis, claim);
    throw error;
  }
}

async function getCitizenMeetings(citizenId) {
  return meetingsRepository.getCitizenMeetings(citizenId);
}

async function getCitizenMeetingDetail(meetingId, citizenId) {
  const meeting = await meetingsRepository.getCitizenMeetingById(meetingId, citizenId);
  if (!meeting) {
    throw createHttpError(404, 'Meeting not found');
  }
  const history = await meetingsRepository.getMeetingHistory(meetingId);
  return { meeting, history };
}

async function getAdminMeetingDetail(meetingId) {
  const meeting = await meetingsRepository.getAdminMeetingById(meetingId);
  if (!meeting) {
    throw createHttpError(404, 'Meeting not found');
  }
  const history = await meetingsRepository.getMeetingHistory(meetingId);
  return { meeting, history };
}

async function getAdminMeetingFiles(meetingId, adminId) {
  const meeting = await meetingsRepository.getMeetingById(meetingId);
  if (!meeting) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(meeting, adminId, {
    allowUnassigned: meeting.status === 'pending',
    actionLabel: 'view files for this meeting',
  });
  const files = await meetingsRepository.listMeetingFilesForAdmin(meetingId, adminId);
  return {
    files: files.map((f) => ({
      id: f.id,
      name: f.original_name,
      mimeType: f.mime_type,
      size: f.file_size,
      kind: f.entity_type,
      createdAt: f.created_at,
    })),
  };
}

async function changeMeetingStatus({
  meetingId,
  actorRole,
  actorId,
  status,
  note,
  patch = {},
  allowedPreviousStatuses,
  actionLabel,
}) {
  const meeting = await meetingsRepository.getMeetingById(meetingId);
  if (!meeting) {
    throw createHttpError(404, 'Meeting not found');
  }
  if (allowedPreviousStatuses?.length) {
    assertAllowedTransition(meeting.status, allowedPreviousStatuses, actionLabel || status);
  }

  await meetingsRepository.updateMeetingStatus({
    meetingId,
    status,
    previousStatus: meeting.status,
    actorRole,
    actorId,
    note,
    patch,
  });

  await publishMeetingStatusUpdate({
    citizenId: meeting.citizen_id,
    meetingId,
    status,
    note,
  });

  return meetingsRepository.getMeetingById(meetingId);
}

async function assignMeetingToSelf(meetingId, adminId, reqMeta) {
  const current = await meetingsRepository.getMeetingById(meetingId);
  if (!current) {
    throw createHttpError(404, 'Meeting not found');
  }
  if (current.assignedAdminUserId && current.assignedAdminUserId !== adminId) {
    throw createHttpError(403, 'Meeting is already assigned to another admin');
  }

  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'admin',
    actorId: adminId,
    status: current.status,
    allowedPreviousStatuses: ['pending'],
    actionLabel: 'assign this meeting',
    note: 'Meeting assigned to admin',
    patch: { assigned_admin_id: adminId },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'meeting',
    entityId: meetingId,
    action: 'meeting_assigned_to_self',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return updated;
}

async function rejectMeeting(meetingId, actorId, reason, reqMeta) {
  const current = await meetingsRepository.getMeetingById(meetingId);
  if (!current) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(current, actorId, {
    actionLabel: 'reject this meeting',
  });

  const cleanReason = sanitizeText(reason);
  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'admin',
    actorId,
    status: 'rejected',
    allowedPreviousStatuses: ['pending', 'accepted', 'verification_pending', 'verified', 'not_verified'],
    actionLabel: 'reject this meeting',
    note: cleanReason,
    patch: {
      assigned_admin_id: actorId,
      rejection_reason: cleanReason,
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'meeting',
    entityId: meetingId,
    action: 'meeting_rejected',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { reason: cleanReason },
  });

  return updated;
}

async function acceptMeeting(meetingId, actorId, reqMeta) {
  const current = await meetingsRepository.getMeetingById(meetingId);
  if (!current) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(current, actorId, {
    actionLabel: 'accept this meeting',
  });

  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'admin',
    actorId,
    status: 'accepted',
    allowedPreviousStatuses: ['pending', 'not_verified'],
    actionLabel: 'accept this meeting',
    note: 'Meeting request accepted',
    patch: { assigned_admin_id: actorId },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'meeting',
    entityId: meetingId,
    action: 'meeting_accepted',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
  return updated;
}

async function assignVerification(meetingId, actorId, deoId, reqMeta) {
  const current = await meetingsRepository.getMeetingById(meetingId);
  if (!current) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(current, actorId, { actionLabel: 'send this meeting for verification' });
  const deo = await adminRepository.findActiveDeoById(deoId);
  if (!deo) {
    throw createHttpError(404, 'Assigned DEO not found');
  }

  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'admin',
    actorId,
    status: 'verification_pending',
    allowedPreviousStatuses: ['accepted', 'not_verified'],
    actionLabel: 'send this meeting for verification',
    note: `Sent to DEO ${deoId} for verification`,
    patch: { assigned_admin_id: actorId, assigned_deo_id: deoId },
  });
  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'meeting',
    entityId: meetingId,
    action: 'meeting_sent_for_verification',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { deoId },
  });
  return updated;
}

async function submitVerification(meetingId, deoId, verified, reason, notes, reqMeta) {
  const current = await meetingsRepository.getMeetingById(meetingId);
  if (!current) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertAssignedDeo(current, deoId);

  const status = verified ? 'verified' : 'not_verified';
  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'deo',
    actorId: deoId,
    status,
    allowedPreviousStatuses: ['verification_pending'],
    actionLabel: verified ? 'verify this meeting' : 'mark this meeting as not verified',
    note: sanitizeText(reason),
    patch: {
      verification_reason: sanitizeText(reason),
      verification_notes: sanitizeText(notes || ''),
    },
  });
  await writeAuditLog({
    actorRole: 'deo',
    actorId: deoId,
    entityType: 'meeting',
    entityId: meetingId,
    action: verified ? 'meeting_verified' : 'meeting_not_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
  return updated;
}

async function scheduleMeeting(meetingId, adminId, body, reqMeta) {
  const meeting = await meetingsRepository.getMeetingById(meetingId);
  if (!meeting) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(meeting, adminId, { actionLabel: meeting.status === 'scheduled' ? 'reschedule this meeting' : 'schedule this meeting' });
  if (meeting.status === 'verification_pending') {
    throw createHttpError(409, 'After verification by DEO only you can schedule meeting');
  }
  const minister = await adminRepository.findActiveMinisterById(body.ministerId);
  if (!minister) {
    throw createHttpError(404, 'Minister not found');
  }

  const payload = {
    ministerId: body.ministerId,
    meetingId,
    title: meeting.title,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: sanitizeText(body.location),
    isVip: body.isVip,
    comments: sanitizeText(body.comments || ''),
    createdByAdminId: adminId,
  };

  const existingEvent = meeting.status === 'scheduled'
    ? await meetingsRepository.updateCalendarEventByMeetingId(meetingId, payload)
    : null;

  const event = existingEvent || await meetingsRepository.createCalendarEvent(payload);

  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'admin',
    actorId: adminId,
    status: 'scheduled',
    allowedPreviousStatuses: ['accepted', 'verified', 'scheduled'],
    actionLabel: meeting.status === 'scheduled' ? 'reschedule this meeting' : 'schedule this meeting',
    note: meeting.status === 'scheduled' ? 'Meeting rescheduled' : 'Meeting scheduled',
    patch: {
      assigned_admin_id: adminId,
      minister_id: body.ministerId,
      scheduled_at: body.startsAt,
      scheduled_end_at: body.endsAt,
      scheduled_location: sanitizeText(body.location),
      is_vip: body.isVip,
      admin_comments: sanitizeText(body.comments || ''),
      visitor_id: meeting.visitorId || generateCaseCode('VIS'),
      meeting_docket: meeting.meetingDocket || generateCaseCode('DOC'),
      cancellation_reason: null,
      cancelled_at: null,
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'meeting',
    entityId: meetingId,
    action: meeting.status === 'scheduled' ? 'meeting_rescheduled' : 'meeting_scheduled',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { eventId: event.id, ministerId: body.ministerId },
  });
  return updated;
}

async function uploadMeetingPhoto(meetingId, adminId, file, reqMeta) {
  const meeting = await meetingsRepository.getMeetingById(meetingId);
  if (!meeting) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(meeting, adminId, {
    actionLabel: 'upload files for this meeting',
  });
  assertAllowedTransition(meeting.status, ['scheduled', 'completed'], 'upload files for this meeting');
  if (!file) {
    throw createHttpError(400, 'File is required');
  }

  const storedFile = await persistPrivateUpload(file, 'photos', PHOTO_ALLOWED);
  const uploaded = await meetingsRepository.createUploadedFile(storedFile, {
    entityType: 'meeting_photo',
    entityId: meetingId,
    uploadedByRole: 'admin',
    uploadedById: adminId,
  });

  await redis.del(`meeting:files:${meetingId}`);

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'meeting',
    entityId: meetingId,
    action: 'meeting_photo_uploaded',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { fileId: uploaded.id, originalName: uploaded.original_name || storedFile.originalName },
  });

  return {
    file: {
      id: uploaded.id,
      name: uploaded.original_name || storedFile.originalName,
      mimeType: uploaded.mime_type || storedFile.mimeType,
      size: uploaded.file_size || storedFile.fileSize,
      kind: uploaded.entity_type || 'meeting_photo',
    },
  };
}

async function completeMeeting(meetingId, adminId, reason, reqMeta) {
  const current = await meetingsRepository.getMeetingById(meetingId);
  if (!current) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(current, adminId, { actionLabel: 'complete this meeting' });

  const cleanReason = sanitizeText(reason);
  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'admin',
    actorId: adminId,
    status: 'completed',
    allowedPreviousStatuses: ['scheduled'],
    actionLabel: 'complete this meeting',
    note: cleanReason,
    patch: {
      assigned_admin_id: adminId,
      completion_note: cleanReason,
      completed_at: new Date().toISOString(),
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'meeting',
    entityId: meetingId,
    action: 'meeting_completed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return updated;
}

async function cancelMeeting(meetingId, adminId, reason, reqMeta) {
  const current = await meetingsRepository.getMeetingById(meetingId);
  if (!current) {
    throw createHttpError(404, 'Meeting not found');
  }
  assertMeetingAdminAccess(current, adminId, {
    allowUnassigned: current.status === 'pending',
    actionLabel: 'cancel this meeting',
  });

  const cleanReason = sanitizeText(reason);
  const updated = await changeMeetingStatus({
    meetingId,
    actorRole: 'admin',
    actorId: adminId,
    status: 'cancelled',
    allowedPreviousStatuses: ['pending', 'accepted', 'verification_pending', 'verified', 'not_verified', 'scheduled'],
    actionLabel: 'cancel this meeting',
    note: cleanReason,
    patch: {
      assigned_admin_id: adminId,
      cancellation_reason: cleanReason,
      cancelled_at: new Date().toISOString(),
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'meeting',
    entityId: meetingId,
    action: 'meeting_cancelled',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return updated;
}

module.exports = {
  submitMeetingRequest,
  getCitizenMeetings,
  getCitizenMeetingDetail,
  getAdminMeetingDetail,
  getAdminMeetingFiles,
  assignMeetingToSelf,
  rejectMeeting,
  acceptMeeting,
  assignVerification,
  submitVerification,
  scheduleMeeting,
  uploadMeetingPhoto,
  completeMeeting,
  cancelMeeting,
};
