const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const meetingsRepository = require('./meetings.repository');
const { sanitizeText } = require('../../utils/sanitize');
const { persistPrivateUpload } = require('../../middleware/uploadHandler');
const { writeAuditLog } = require('../../utils/audit');
const { publishMeetingStatusUpdate } = require('../../realtime/wsPublisher');
const { generateCaseCode } = require('../../utils/generateCaseCode');

async function enforceIdempotency(idempotencyKey, payload) {
  if (!idempotencyKey) {
    throw createHttpError(400, 'Idempotency-Key header is required');
  }
  const key = `idempotency:${idempotencyKey}`;
  const existing = await redis.get(key);
  if (existing) {
    return JSON.parse(existing);
  }
  const pending = JSON.stringify({ pending: true, payload });
  const claimed = await redis.set(key, pending, 'EX', 600, 'NX');
  if (claimed) {
    return null;
  }
  const current = await redis.get(key);
  if (current) {
    const parsed = JSON.parse(current);
    if (parsed.pending) {
      throw createHttpError(409, 'Request is already being processed');
    }
    return parsed;
  }
  throw createHttpError(409, 'Duplicate request detected');
}

async function saveIdempotencyResult(idempotencyKey, result) {
  await redis.set(`idempotency:${idempotencyKey}`, JSON.stringify(result), 'EX', 600);
}

async function clearIdempotency(idempotencyKey) {
  if (!idempotencyKey) return;
  await redis.del(`idempotency:${idempotencyKey}`);
}

function assertAllowedTransition(currentStatus, allowedStatuses, actionLabel) {
  if (!allowedStatuses.includes(currentStatus)) {
    throw createHttpError(409, `Cannot ${actionLabel} when meeting status is ${currentStatus}`);
  }
}

async function submitMeetingRequest({ citizenId, body, file, reqMeta, idempotencyKey }) {
  const existing = await enforceIdempotency(idempotencyKey, body);
  if (existing && !existing.pending) {
    return existing;
  }

  try {
    let document = null;
    if (file) {
      const storedFile = await persistPrivateUpload(file, 'documents');
      document = await meetingsRepository.createUploadedFile(storedFile, {
        entityType: 'meeting_document',
        uploadedByRole: 'citizen',
        uploadedById: citizenId,
      });
    }

    const meeting = await meetingsRepository.createMeeting({
      citizenId,
      title: sanitizeText(body.title),
      purpose: sanitizeText(body.purpose),
      preferredTime: body.preferredTime || null,
      adminReferral: sanitizeText(body.adminReferral || ''),
      documentFileId: document?.id,
      additionalAttendees: body.additionalAttendees || [],
    });

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
    await saveIdempotencyResult(idempotencyKey, result);
    return result;
  } catch (error) {
    await clearIdempotency(idempotencyKey);
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

async function rejectMeeting(meetingId, actorId, reason, reqMeta) {
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

async function completeMeeting(meetingId, adminId, reason, reqMeta) {
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
  rejectMeeting,
  acceptMeeting,
  assignVerification,
  submitVerification,
  scheduleMeeting,
  completeMeeting,
  cancelMeeting,
};
