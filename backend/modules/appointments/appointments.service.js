const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const appointmentsRepository = require('./appointments.repository');
const adminRepository = require('../admin/admin.repository');
const { sanitizeText } = require('../../utils/sanitize');
const { persistPrivateUpload, PHOTO_ALLOWED } = require('../../middleware/uploadHandler');
const { writeAuditLog } = require('../../utils/audit');
const filesService = require('../files/files.service');
const {
  notifyCitizenAppointmentStatusUpdate,
  notifyDeoVerificationAssigned,
  notifyAdminAppointmentVerified,
  notifyAdminPoolAppointmentSubmitted,
  notifyMinisterAppointmentScheduled,
  notifyMinisterAppointmentChanged,
  notifyAdminScheduledAppointmentUpcoming,
  notifyAdminScheduledAppointmentCompleted,
} = require('../notifications/notifications.service');
const { generateCaseCode } = require('../../utils/generateCaseCode');
const logger = require('../../utils/logger');
const { claimIdempotency, storeIdempotencyResult, clearIdempotency } = require('../../utils/idempotency');

function assertAllowedTransition(currentStatus, allowedStatuses, actionLabel) {
  if (!allowedStatuses.includes(currentStatus)) {
    throw createHttpError(409, `Cannot ${actionLabel} when appointment status is ${currentStatus}`);
  }
}

function assertAppointmentAdminAccess(appointment, adminId, { allowUnassigned = false, actionLabel = 'modify this appointment' } = {}) {
  if (!appointment.assignedAdminUserId) {
    if (allowUnassigned) {
      return;
    }
    throw createHttpError(409, `Cannot ${actionLabel} because the appointment is not assigned`);
  }
  if (appointment.assignedAdminUserId !== adminId) {
    throw createHttpError(403, 'Only the assigned admin can perform this action');
  }
}

function assertAssignedDeo(appointment, deoId) {
  if (!appointment.assignedDeoId) {
    throw createHttpError(409, 'This appointment is not assigned to a DEO');
  }
  if (appointment.assignedDeoId !== deoId) {
    throw createHttpError(403, 'Only the assigned DEO can verify this appointment');
  }
}

function assertAppointmentScheduleHasPassed(appointment) {
  const referenceDate = appointment.scheduled_at;
  const parsedReferenceDate = referenceDate ? new Date(referenceDate) : null;
  if (!parsedReferenceDate || Number.isNaN(parsedReferenceDate.getTime()) || parsedReferenceDate.getTime() > Date.now()) {
    throw createHttpError(409, 'Appointment is yet not completed. You cannot mark it as completed. You can cancel appointment if required.');
  }
}

function isScheduledAppointmentStatus(status) {
  return status === 'scheduled' || status === 'rescheduled';
}

async function submitAppointmentRequest({ citizenId, body, file, reqMeta, idempotencyKey }) {
  const claim = await claimIdempotency(redis, {
    scope: 'appointment_submission',
    explicitKey: idempotencyKey,
    actorId: citizenId,
    body,
    file,
    payload: body,
  });
  if (claim.existing && !claim.existing.pending) {
    logger.info('Returning cached appointment submission response', {
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
      document = await appointmentsRepository.createUploadedFile(storedFile, {
        entityType: 'appointment_document',
        uploadedByRole: 'citizen',
        uploadedById: citizenId,
      });
    }

    const createdAppointment = await appointmentsRepository.createAppointment({
      citizenId,
      title: sanitizeText(body.title),
      purpose: sanitizeText(body.purpose),
      preferredTime: body.preferredTime || null,
      adminReferral: sanitizeText(body.adminReferral || ''),
      assignedAdminId,
      documentFileId: document?.id,
      additionalAttendees: body.additionalAttendees || [],
    });
    const appointment = await appointmentsRepository.getAppointmentById(createdAppointment.id) || createdAppointment;

    await writeAuditLog({
      actorRole: 'citizen',
      actorId: citizenId,
      entityType: 'appointment',
      entityId: appointment.id,
      action: 'appointment_submitted',
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    await notifyAdminPoolAppointmentSubmitted({
      appointmentId: appointment.id,
      appointmentTitle: appointment.title || appointment.requestId,
      citizenId,
      assignedAdminId,
    });

    const result = { appointment };
    await storeIdempotencyResult(redis, claim, result);
    return result;
  } catch (error) {
    await clearIdempotency(redis, claim);
    throw error;
  }
}

// WHY: Optional pagination params. If absent → same behavior as before (returns all).
// page/limit only applied when limit is provided. Limit capped at 100.
async function getCitizenAppointments(citizenId, { page, limit } = {}) {
  const parsedLimit = (limit != null && !Number.isNaN(Number(limit)))
    ? Math.min(Math.max(1, Number(limit)), 100)
    : undefined;
  const parsedPage = (parsedLimit != null && page != null && !Number.isNaN(Number(page)))
    ? Math.max(1, Number(page))
    : undefined;
  const parsedOffset = parsedPage != null ? (parsedPage - 1) * parsedLimit : undefined;
  const appointments = await appointmentsRepository.getCitizenAppointments(citizenId, {
    limit: parsedLimit,
    offset: parsedOffset,
  });
  // WHY: Return pagination metadata only when params were supplied so clients can detect
  // partial results. When no pagination params given, metadata is omitted (backward-compatible).
  if (parsedLimit != null) {
    return {
      appointments,
      pagination: {
        page: parsedPage || 1,
        limit: parsedLimit,
        hasMore: appointments.length === parsedLimit,
      },
    };
  }
  return { appointments };
}

async function getCitizenAppointmentDetail(appointmentId, citizenId, reqMeta) {
  const appointment = await appointmentsRepository.getCitizenAppointmentById(appointmentId, citizenId);
  if (!appointment) {
    throw createHttpError(404, 'Appointment not found');
  }
  const history = await appointmentsRepository.getAppointmentHistory(appointmentId);
  const files = [];
  if (appointment.document_file_id) {
    const document = await filesService.createLegacyDownloadAccess({
      fileId: appointment.document_file_id,
      actorRole: 'citizen',
      actorId: citizenId,
      scope: { entityType: 'appointment', entityId: appointmentId },
    });
    appointment.document = document.file;
    appointment.document.downloadUrl = document.downloadUrl;
    files.push({
      ...document.file,
      fileCategory: 'document',
      downloadUrl: document.downloadUrl,
    });
  }
  const managedFiles = await filesService.listOwnedFiles({
    actorRole: 'citizen',
    actorId: citizenId,
    contextType: 'appointment',
    contextId: appointmentId,
    reqMeta,
  });
  appointment.files = [...files, ...managedFiles];
  return { appointment, history };
}

async function getAdminAppointmentDetail(appointmentId) {
  const appointment = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!appointment) {
    throw createHttpError(404, 'Appointment not found');
  }
  const history = await appointmentsRepository.getAppointmentHistory(appointmentId);
  return { appointment, history };
}

async function getAdminAppointmentFiles(appointmentId, adminId, reqMeta) {
  const appointment = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!appointment) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(appointment, adminId, {
    allowUnassigned: appointment.status === 'pending',
    actionLabel: 'view files for this appointment',
  });
  const files = await appointmentsRepository.listAppointmentFilesForAdmin(appointmentId, adminId);
  return {
    files: await Promise.all(files.map(async (f) => {
      if (f.source_kind === 'managed') {
        const download = await filesService.createDownloadUrl({
          fileId: f.id,
          actorRole: 'admin',
          actorId: adminId,
          reqMeta,
        });
        return {
          id: f.id,
          name: f.original_name,
          mimeType: f.mime_type,
          size: f.file_size,
          kind: f.entity_type,
          createdAt: f.created_at,
          downloadUrl: download.downloadUrl,
        };
      }

      const download = await filesService.createLegacyDownloadAccess({
        fileId: f.id,
        actorRole: 'admin',
        actorId: adminId,
        reqMeta,
        scope: { entityType: 'appointment', entityId: appointmentId },
      });
      return {
        id: f.id,
        name: f.original_name,
        mimeType: f.mime_type,
        size: f.file_size,
        kind: f.entity_type,
        createdAt: f.created_at,
        downloadUrl: download.downloadUrl,
      };
    })),
  };
}

async function changeAppointmentStatus({
  appointmentId,
  actorRole,
  actorId,
  status,
  note,
  patch = {},
  allowedPreviousStatuses,
  actionLabel,
  calendarEvent = null,
}) {
  const appointment = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!appointment) {
    throw createHttpError(404, 'Appointment not found');
  }
  if (allowedPreviousStatuses?.length) {
    assertAllowedTransition(appointment.status, allowedPreviousStatuses, actionLabel || status);
  }

  await appointmentsRepository.updateAppointmentStatus({
    appointmentId,
    status,
    previousStatus: appointment.status,
    actorRole,
    actorId,
    note,
    patch,
    calendarEvent,
  });

  await notifyCitizenAppointmentStatusUpdate({
    citizenId: appointment.citizen_id,
    appointmentId,
    status,
    note,
  });

  return appointmentsRepository.getAppointmentById(appointmentId);
}

async function assignAppointmentToSelf(appointmentId, adminId, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  if (current.status !== 'pending') {
    throw createHttpError(409, `Cannot assign this appointment when appointment status is ${current.status}`);
  }

  const claimed = await appointmentsRepository.atomicClaimAppointment(appointmentId, adminId);
  if (!claimed) {
    throw createHttpError(409, 'Appointment has already been claimed by another admin');
  }

  await notifyCitizenAppointmentStatusUpdate({
    citizenId: current.citizen_id,
    appointmentId,
    status: 'accepted',
    note: 'Appointment assigned to admin',
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_assigned_to_self',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return appointmentsRepository.getAppointmentById(appointmentId);
}

async function rejectAppointment(appointmentId, actorId, reason, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(current, actorId, {
    actionLabel: 'reject this appointment',
  });

  const cleanReason = sanitizeText(reason);
  const updated = await changeAppointmentStatus({
    appointmentId,
    actorRole: 'admin',
    actorId,
    status: 'rejected',
    allowedPreviousStatuses: ['pending', 'accepted', 'verified', 'not_verified'],
    actionLabel: 'reject this appointment',
    note: cleanReason,
    patch: {
      assigned_admin_id: actorId,
      rejection_reason: cleanReason,
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_rejected',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { reason: cleanReason },
  });

  return updated;
}

async function acceptAppointment(appointmentId, actorId, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(current, actorId, {
    actionLabel: 'accept this appointment',
  });

  const updated = await changeAppointmentStatus({
    appointmentId,
    actorRole: 'admin',
    actorId,
    status: 'accepted',
    allowedPreviousStatuses: ['pending', 'not_verified'],
    actionLabel: 'accept this appointment',
    note: 'Appointment request accepted',
    patch: { assigned_admin_id: actorId },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_accepted',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
  return updated;
}

async function assignVerification(appointmentId, actorId, deoId, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(current, actorId, { actionLabel: 'send this appointment for verification' });
  const deo = await adminRepository.findActiveDeoById(deoId);
  if (!deo) {
    throw createHttpError(404, 'Assigned DEO not found');
  }

  const updated = await changeAppointmentStatus({
    appointmentId,
    actorRole: 'admin',
    actorId,
    status: 'verification_pending',
    allowedPreviousStatuses: ['accepted', 'not_verified'],
    actionLabel: 'send this appointment for verification',
    note: `Sent to DEO ${deoId} for verification`,
    patch: { assigned_admin_id: actorId, assigned_deo_id: deoId },
  });
  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_sent_for_verification',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { deoId },
  });

  await notifyDeoVerificationAssigned({
    deoId,
    appointmentId,
    adminId: actorId,
    appointmentTitle: updated.title || updated.requestId,
  });
  return updated;
}

async function submitVerification(appointmentId, deoId, verified, reason, notes, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAssignedDeo(current, deoId);

  const status = verified ? 'verified' : 'not_verified';
  const updated = await changeAppointmentStatus({
    appointmentId,
    actorRole: 'deo',
    actorId: deoId,
    status,
    allowedPreviousStatuses: ['verification_pending'],
    actionLabel: verified ? 'verify this appointment' : 'mark this appointment as not verified',
    note: sanitizeText(reason),
    patch: {
      verification_reason: sanitizeText(reason),
      verification_notes: sanitizeText(notes || ''),
    },
  });
  await writeAuditLog({
    actorRole: 'deo',
    actorId: deoId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: verified ? 'appointment_verified' : 'appointment_not_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  if (verified && current.assignedAdminUserId) {
    await notifyAdminAppointmentVerified({
      adminId: current.assignedAdminUserId,
      appointmentId,
      deoId,
      appointmentTitle: updated.title || updated.requestId,
    });
  }
  return updated;
}

async function scheduleAppointment(appointmentId, adminId, body, reqMeta) {
  const appointment = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!appointment) {
    throw createHttpError(404, 'Appointment not found');
  }
  const isReschedule = isScheduledAppointmentStatus(appointment.status);
  assertAppointmentAdminAccess(appointment, adminId, { actionLabel: isReschedule ? 'reschedule this appointment' : 'schedule this appointment' });
  // Block scheduling while the appointment is still with DEO verification.
  if (appointment.status === 'verification_pending' || appointment.status === 'SENT_FOR_DEO_VERIFICATION') {
    throw createHttpError(409, 'You cannot schedule this appointment as it is sent for DEO verification.');
  }
  const resolvedMinisterId = body.ministerId || appointment.ministerId;
  if (resolvedMinisterId) {
    const minister = await adminRepository.findActiveMinisterById(resolvedMinisterId);
    if (!minister) {
      throw createHttpError(404, 'Minister not found');
    }
  }

  const updated = await changeAppointmentStatus({
    appointmentId,
    actorRole: 'admin',
    actorId: adminId,
    status: isReschedule ? 'rescheduled' : 'scheduled',
    allowedPreviousStatuses: ['accepted', 'verified', 'scheduled', 'rescheduled'],
    actionLabel: isReschedule ? 'reschedule this appointment' : 'schedule this appointment',
    note: isReschedule ? 'Appointment rescheduled' : 'Appointment scheduled',
    patch: {
      assigned_admin_id: adminId,
      minister_id: resolvedMinisterId || null,
      scheduled_at: body.startsAt,
      scheduled_end_at: body.endsAt,
      scheduled_location: sanitizeText(body.location),
      is_vip: body.isVip,
      admin_comments: sanitizeText(body.comments || ''),
      visitor_id: appointment.visitorId || generateCaseCode('VIS'),
      appointment_docket: appointment.appointmentDocket || generateCaseCode('DOC'),
      cancellation_reason: null,
      cancelled_at: null,
    },
    calendarEvent: resolvedMinisterId ? {
      action: 'upsert',
      ministerId: resolvedMinisterId,
      title: appointment.title,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      location: sanitizeText(body.location),
      isVip: body.isVip,
      comments: sanitizeText(body.comments || ''),
      createdByAdminId: adminId,
    } : undefined,
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: isReschedule ? 'appointment_rescheduled' : 'appointment_scheduled',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { ministerId: resolvedMinisterId },
  });

  await notifyMinisterAppointmentScheduled({
    ministerId: body.ministerId,
    appointmentId,
    appointmentTitle: updated.title || updated.requestId,
    scheduledAt: body.startsAt,
    location: sanitizeText(body.location),
    adminId,
    isRescheduled: isReschedule,
  });

  await notifyAdminScheduledAppointmentUpcoming({
    adminId,
    entityType: 'appointment',
    entityId: appointmentId,
    title: updated.title || updated.requestId,
    scheduledAt: body.startsAt,
  });

  return updated;
}

async function uploadAppointmentPhoto(appointmentId, adminId, file, reqMeta) {
  const appointment = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!appointment) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(appointment, adminId, {
    actionLabel: 'upload files for this appointment',
  });
  assertAllowedTransition(appointment.status, ['scheduled', 'rescheduled', 'completed'], 'upload files for this appointment');
  if (!file) {
    throw createHttpError(400, 'File is required');
  }

  const storedFile = await persistPrivateUpload(file, 'photos', PHOTO_ALLOWED);
  const uploaded = await appointmentsRepository.createUploadedFile(storedFile, {
    entityType: 'appointment_photo',
    entityId: appointmentId,
    uploadedByRole: 'admin',
    uploadedById: adminId,
  });

  await redis.del(`appointment:files:${appointmentId}`);

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_photo_uploaded',
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
      kind: uploaded.entity_type || 'appointment_photo',
    },
  };
}

async function completeAppointment(appointmentId, adminId, reason, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(current, adminId, { actionLabel: 'complete this appointment' });
  assertAppointmentScheduleHasPassed(current);

  const cleanReason = sanitizeText(reason);
  const updated = await changeAppointmentStatus({
    appointmentId,
    actorRole: 'admin',
    actorId: adminId,
    status: 'completed',
    allowedPreviousStatuses: ['scheduled', 'rescheduled'],
    actionLabel: 'complete this appointment',
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
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_completed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  await notifyAdminScheduledAppointmentCompleted({
    adminId,
    entityType: 'appointment',
    entityId: appointmentId,
    title: updated.title || updated.requestId,
    completedByRole: 'admin',
  });

  return updated;
}

async function cancelAppointment(appointmentId, adminId, reason, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(current, adminId, {
    allowUnassigned: current.status === 'pending',
    actionLabel: 'cancel this appointment',
  });

  const cleanReason = sanitizeText(reason);
  const updated = await changeAppointmentStatus({
    appointmentId,
    actorRole: 'admin',
    actorId: adminId,
    status: 'cancelled',
    allowedPreviousStatuses: ['pending', 'accepted', 'verification_pending', 'verified', 'not_verified', 'scheduled', 'rescheduled'],
    actionLabel: 'cancel this appointment',
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
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_cancelled',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  if (current.ministerId) {
    await notifyMinisterAppointmentChanged({
      ministerId: current.ministerId,
      appointmentId,
      appointmentTitle: updated.title || updated.requestId,
      changeType: 'cancelled',
      location: updated.scheduled_location,
      scheduledAt: updated.scheduled_at,
      actorRole: 'admin',
    });
  }

  return updated;
}

async function addMeetingLog(appointmentId, adminId, notes, reqMeta) {
  const current = await appointmentsRepository.getAppointmentById(appointmentId);
  if (!current) {
    throw createHttpError(404, 'Appointment not found');
  }
  assertAppointmentAdminAccess(current, adminId, { actionLabel: 'add logs to this appointment' });
  if (!['scheduled', 'rescheduled'].includes(current.status)) {
    throw createHttpError(409, 'Meeting logs can only be added to scheduled appointments');
  }

  const cleanNotes = sanitizeText(notes || '');
  const updated = await appointmentsRepository.patchAppointment(appointmentId, {
    admin_comments: cleanNotes,
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'appointment',
    entityId: appointmentId,
    action: 'appointment_log_added',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return updated;
}

module.exports = {
  submitAppointmentRequest,
  getCitizenAppointments,
  getCitizenAppointmentDetail,
  getAdminAppointmentDetail,
  getAdminAppointmentFiles,
  assignAppointmentToSelf,
  rejectAppointment,
  acceptAppointment,
  assignVerification,
  submitVerification,
  scheduleAppointment,
  uploadAppointmentPhoto,
  completeAppointment,
  cancelAppointment,
  addMeetingLog,
};
