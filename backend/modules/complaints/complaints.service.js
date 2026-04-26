const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const complaintsRepository = require('./complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const adminRepository = require('../admin/admin.repository');
const filesService = require('../files/files.service');
const { persistPrivateUpload } = require('../../middleware/uploadHandler');
const { sanitizeText } = require('../../utils/sanitize');
const { writeAuditLog } = require('../../utils/audit');
const {
  notifyCitizenComplaintStatusUpdate,
  notifyAdminPoolComplaintSubmitted,
  notifyAdminComplaintEscalatedToPool,
  notifyAdminComplaintReassigned,
  notifyAdminScheduledMeetingUpcoming,
  notifyAdminScheduledMeetingCompleted,
} = require('../notifications/notifications.service');
const logger = require('../../utils/logger');
const { claimIdempotency, storeIdempotencyResult, clearIdempotency } = require('../../utils/idempotency');

function sanitizeOptional(input) {
  if (!input) return null;
  return sanitizeText(input);
}

function complaintLogTypeLabel(logType) {
  if (logType === 'phone_call') return 'Phone Call';
  if (logType === 'mail') return 'Mail';
  if (logType === 'letter_summary') return 'Letter';
  if (logType === 'meeting') return 'Meeting';
  return 'Log';
}

async function submitComplaint({ citizenId, body, file, reqMeta, idempotencyKey }) {
  const claim = await claimIdempotency(redis, {
    scope: 'complaint_submission',
    explicitKey: idempotencyKey,
    actorId: citizenId,
    body,
    file,
    payload: body,
  });

  if (claim.existing && !claim.existing.pending) {
    logger.info('Returning cached complaint submission response', {
      citizenId,
      keySource: claim.source,
    });
    return claim.existing;
  }

  try {
    let document = null;
    if (file) {
      const storedFile = await persistPrivateUpload(file, 'documents');
      document = await meetingsRepository.createUploadedFile(storedFile, {
        entityType: 'complaint_document',
        uploadedByRole: 'citizen',
        uploadedById: citizenId,
      });
    }

    const createdComplaint = await complaintsRepository.createComplaint({
      citizenId,
      subject: sanitizeText(body.subject),
      description: sanitizeText(body.description),
      complaintLocation: sanitizeOptional(body.complaintLocation),
      complaintType: sanitizeOptional(body.complaintType),
      incidentDate: body.incidentDate,
      documentFileId: document?.id,
    });
    const complaint = await complaintsRepository.getComplaintById(createdComplaint.id) || createdComplaint;

    await writeAuditLog({
      actorRole: 'citizen',
      actorId: citizenId,
      entityType: 'complaint',
      entityId: complaint.id,
      action: 'complaint_submitted',
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    await notifyAdminPoolComplaintSubmitted({
      complaintId: complaint.id,
      complaintTitle: complaint.subject || complaint.complaintId,
      citizenId,
    });

    const result = { complaint };
    await storeIdempotencyResult(redis, claim, result);
    return result;
  } catch (error) {
    await clearIdempotency(redis, claim);
    throw error;
  }
}

async function getCitizenComplaints(citizenId) {
  return complaintsRepository.getCitizenComplaints(citizenId);
}

async function getCitizenComplaintDetail(complaintId, citizenId, reqMeta) {
  const complaint = await complaintsRepository.getCitizenComplaintById(complaintId, citizenId);
  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }
  const history = await complaintsRepository.getComplaintHistory(complaintId);
  const files = [];
  try {
    if (complaint.document_file_id) {
      const document = await filesService.createLegacyDownloadAccess({
        fileId: complaint.document_file_id,
        actorRole: 'citizen',
        actorId: citizenId,
        scope: { entityType: 'complaint', entityId: complaintId },
      });
      complaint.document = {
        ...document.file,
        downloadUrl: document.downloadUrl,
      };
      files.push({
        ...document.file,
        fileCategory: 'document',
        downloadUrl: document.downloadUrl,
      });
    }
    const managedFiles = await filesService.listOwnedFiles({
      actorRole: 'citizen',
      actorId: citizenId,
      contextType: 'complaint',
      contextId: complaintId,
      reqMeta,
    });
    complaint.files = [...files, ...managedFiles];
  } catch (_) {
    complaint.files = files;
  }
  return { complaint, history };
}

async function getAdminComplaintDetail(complaintId, adminId, reqMeta) {
  const complaint = await complaintsRepository.getComplaintById(complaintId);
  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }
  const [history, admins] = await Promise.all([
    complaintsRepository.getComplaintHistory(complaintId),
    adminRepository.listActiveAdminsForCitizenDirectory(),
  ]);

  const contacts = complaint.department || complaint.officerName || complaint.officerContact || complaint.manualContact
    ? [{
      department: complaint.department || 'General Administration',
      officerName: complaint.officerName || '',
      designation: 'Department Contact',
      phone: complaint.manualContact || complaint.officerContact || '',
    }]
    : [];

  const files = [];
  try {
    if (complaint.document_file_id && complaint.assignedAdminUserId === adminId) {
      const document = await filesService.createLegacyDownloadAccess({
        fileId: complaint.document_file_id,
        actorRole: 'admin',
        actorId: adminId,
        scope: { entityType: 'complaint', entityId: complaintId },
      });
      complaint.document = {
        ...document.file,
        downloadUrl: document.downloadUrl,
      };
      files.push({
        ...document.file,
        fileCategory: 'document',
        downloadUrl: document.downloadUrl,
      });
    }

    const managedFiles = await filesService.listFiles({
      actorRole: 'admin',
      actorId: adminId,
      query: {
        contextType: 'complaint',
        contextId: complaintId,
      },
    });
    const hydratedManagedFiles = await Promise.all(
      managedFiles.files.map(async (file) => {
        const download = await filesService.createDownloadUrl({
          fileId: file.id,
          actorRole: 'admin',
          actorId: adminId,
          reqMeta,
        });
        return {
          ...file,
          downloadUrl: download.downloadUrl,
        };
      })
    );
    complaint.files = [...files, ...hydratedManagedFiles];
  } catch (_) {
    complaint.files = files;
  }

  return {
    complaint,
    history,
    contacts,
    admins: admins.map((admin) => ({
      id: admin.id,
      name: [admin.first_name, admin.last_name].filter(Boolean).join(' '),
      department: admin.designation,
    })),
  };
}

function assertAllowedComplaintTransition(currentStatus, allowedStatuses, actionLabel) {
  if (!allowedStatuses.includes(currentStatus)) {
    throw createHttpError(409, `Cannot ${actionLabel} when complaint status is ${currentStatus}`);
  }
}

function assertComplaintAdminAccess(complaint, adminId, { allowUnassigned = false, actionLabel = 'modify this complaint' } = {}) {
  if (!complaint.assignedAdminUserId) {
    if (allowUnassigned) {
      return;
    }
    throw createHttpError(409, `Cannot ${actionLabel} because the complaint is not assigned`);
  }
  if (complaint.assignedAdminUserId !== adminId) {
    throw createHttpError(403, 'Only the assigned admin can perform this action');
  }
}

async function applyComplaintTransition({
  complaintId,
  actorId,
  actorRole,
  nextStatus,
  note,
  patch = {},
  allowedPreviousStatuses,
  actionLabel,
}) {
  const complaint = await complaintsRepository.getComplaintById(complaintId);
  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }
  if (allowedPreviousStatuses?.length) {
    assertAllowedComplaintTransition(
      complaint.status,
      allowedPreviousStatuses,
      actionLabel || nextStatus,
    );
  }

  await complaintsRepository.updateComplaintStatus({
    complaintId,
    status: nextStatus,
    previousStatus: complaint.status,
    actorRole,
    actorId,
    note,
    patch,
  });

  const updated = await complaintsRepository.getComplaintById(complaintId);
  await notifyCitizenComplaintStatusUpdate({
    citizenId: complaint.citizen_id,
    complaintId,
    status: nextStatus,
    note,
  });
  return updated;
}

async function assignComplaintToSelf(complaintId, adminId, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  if (current.assignedAdminUserId && current.assignedAdminUserId !== adminId) {
    throw createHttpError(403, 'Complaint is already assigned to another admin');
  }

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId: adminId,
    actorRole: 'admin',
    nextStatus: 'assigned',
    allowedPreviousStatuses: ['submitted', 'assigned'],
    actionLabel: 'assign this complaint',
    note: 'Complaint assigned to admin',
    patch: { assigned_admin_id: adminId },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: adminId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_assigned_to_self',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return complaint;
}

async function reassignComplaint(complaintId, actorId, adminId, reason, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  const targetAdmin = await adminRepository.findActiveAdminById(adminId);
  if (!targetAdmin) {
    throw createHttpError(404, 'Selected admin not found');
  }
  assertComplaintAdminAccess(current, actorId, {
    allowUnassigned: false,
    actionLabel: 'reassign this complaint',
  });

  const sanitizedReason = sanitizeOptional(reason) || 'Complaint reassigned';
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'assigned',
    allowedPreviousStatuses: [
      'submitted',
      'assigned',
      'in_review',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'reassign this complaint',
    note: sanitizedReason,
    patch: {
      assigned_admin_id: adminId,
      handoff_type: 'reassigned',
      handoff_by_admin_id: actorId,
      handoff_to_admin_id: adminId,
      status_reason: sanitizedReason,
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_reassigned',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { adminId },
  });

  await notifyAdminComplaintReassigned({
    complaintId,
    complaintTitle: complaint.subject || complaint.complaintId,
    actorAdminId: actorId,
    targetAdminId: adminId,
    reason: sanitizeText(reason),
  });

  return complaint;
}

async function startComplaintReview(complaintId, actorId, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'start review for this complaint' });

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'in_review',
    allowedPreviousStatuses: ['assigned', 'in_review'],
    actionLabel: 'start review for this complaint',
    note: 'Complaint review started',
    patch: {
      status_reason: 'Complaint review started',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_review_started',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return complaint;
}

async function updateComplaintDepartment(complaintId, actorId, body, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'update department handling for this complaint' });

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'department_contact_identified',
    allowedPreviousStatuses: [
      'assigned',
      'in_review',
      'department_contact_identified',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'update department handling for this complaint',
    note: 'Department flow updated',
    patch: {
      department: sanitizeText(body.department),
      officer_name: sanitizeOptional(body.officerName),
      officer_contact: sanitizeOptional(body.officerContact),
      manual_contact: sanitizeOptional(body.manualContact),
      status_reason: 'Department contact identified',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_department_updated',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return complaint;
}

async function scheduleComplaintCall(complaintId, actorId, callScheduledAt, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'schedule a call for this complaint' });
  const scheduleAt = new Date(callScheduledAt);
  if (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() <= Date.now()) {
    throw createHttpError(400, 'Call date and time must be in the future');
  }

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'call_scheduled',
    allowedPreviousStatuses: [
      'assigned',
      'in_review',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'schedule a call for this complaint',
    note: 'Follow-up meeting scheduled',
    patch: {
      call_scheduled_at: callScheduledAt,
      status_reason: 'Follow-up meeting scheduled',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_call_scheduled',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  await notifyAdminScheduledMeetingUpcoming({
    adminId: actorId,
    entityType: 'complaint',
    entityId: complaintId,
    title: complaint.subject || complaint.complaintId,
    scheduledAt: callScheduledAt,
  });

  return complaint;
}

async function logComplaintAction(complaintId, actorId, body, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'log this complaint activity' });
  const summary = sanitizeOptional(body.summary);
  const logTypes = Array.isArray(body.logTypes) ? body.logTypes : [];
  const logLabels = logTypes.map(complaintLogTypeLabel).join(', ');
  const note = summary
    ? `${logLabels}: ${summary}`
    : `${logLabels} logged`;

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: current.status === 'assigned' ? 'in_review' : current.status,
    allowedPreviousStatuses: ['assigned', 'in_review', 'call_scheduled', 'followup_in_progress'],
    actionLabel: 'log this complaint activity',
    note,
    patch: { call_outcome: note },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_log_added',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { logTypes },
  });

  return complaint;
}

async function resolveComplaint(complaintId, actorId, body, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'resolve this complaint' });

  const docNames = (body.resolutionDocs || []).map((doc) => sanitizeText(doc.name)).filter(Boolean);
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'resolved',
    allowedPreviousStatuses: [
      'assigned',
      'in_review',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'resolve this complaint',
    note: sanitizeText(body.resolutionSummary),
    patch: {
      resolution_summary: sanitizeText(body.resolutionSummary),
      resolution_note: sanitizeText(body.resolutionSummary),
      resolution_document_names: docNames,
      status_reason: 'Complaint resolved',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_resolved',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return complaint;
}

async function escalateComplaintToMeeting(complaintId, actorId, body, reqMeta) {
  const complaint = await complaintsRepository.getComplaintById(complaintId);
  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(complaint, actorId, { actionLabel: 'escalate this complaint' });
  assertAllowedComplaintTransition(
    complaint.status,
    ['assigned', 'in_review', 'call_scheduled', 'followup_in_progress'],
    'escalate this complaint',
  );

  await complaintsRepository.updateComplaintStatus({
    complaintId,
    status: 'submitted',
    previousStatus: complaint.status,
    actorRole: 'admin',
    actorId,
    note: sanitizeText(body.reason),
    patch: {
      assigned_admin_id: null,
      handoff_type: 'escalated',
      handoff_by_admin_id: actorId,
      handoff_to_admin_id: null,
      status_reason: sanitizeText(body.reason),
    },
  });

  await notifyCitizenComplaintStatusUpdate({
    citizenId: complaint.citizen_id,
    complaintId,
    status: 'submitted',
    note: sanitizeText(body.reason),
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_escalated_to_pool',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  await notifyAdminComplaintEscalatedToPool({
    complaintId,
    complaintTitle: complaint.subject || complaint.complaintId,
    actorAdminId: actorId,
    note: sanitizeText(body.reason),
  });

  return { complaint: await complaintsRepository.getComplaintById(complaintId) };
}

async function reopenComplaint(complaintId, actorId, reason, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'reopen this complaint' });
  const reopenedCount = (current?.reopenedCount || 0) + 1;
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'assigned',
    allowedPreviousStatuses: ['resolved', 'completed', 'rejected', 'escalated_to_meeting'],
    actionLabel: 'reopen this complaint',
    note: sanitizeText(reason),
    patch: {
      reopened_count: reopenedCount,
      status_reason: sanitizeText(reason),
      closed_at: null,
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_reopened',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  if (current.callScheduledAt) {
    await notifyAdminScheduledMeetingCompleted({
      adminId: actorId,
      entityType: 'complaint',
      entityId: complaintId,
      title: complaint.subject || complaint.complaintId,
      completedByRole: 'admin',
    });
  }

  return complaint;
}

async function closeComplaint(complaintId, actorId, note, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'close this complaint' });

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'completed',
    allowedPreviousStatuses: ['resolved'],
    actionLabel: 'close this complaint',
    note: sanitizeText(note),
    patch: {
      closed_at: new Date().toISOString(),
      status_reason: sanitizeText(note),
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_closed',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  if (current.callScheduledAt) {
    await notifyAdminScheduledMeetingCompleted({
      adminId: actorId,
      entityType: 'complaint',
      entityId: complaintId,
      title: complaint.subject || complaint.complaintId,
      completedByRole: 'admin',
    });
  }

  return complaint;
}

module.exports = {
  submitComplaint,
  getCitizenComplaints,
  getCitizenComplaintDetail,
  getAdminComplaintDetail,
  assignComplaintToSelf,
  reassignComplaint,
  startComplaintReview,
  updateComplaintDepartment,
  scheduleComplaintCall,
  logComplaintAction,
  resolveComplaint,
  escalateComplaintToMeeting,
  reopenComplaint,
  closeComplaint,
};
