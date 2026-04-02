const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const complaintsRepository = require('./complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const adminRepository = require('../admin/admin.repository');
const { persistPrivateUpload } = require('../../middleware/uploadHandler');
const { sanitizeText } = require('../../utils/sanitize');
const { writeAuditLog } = require('../../utils/audit');
const { publishComplaintStatusUpdate } = require('../../realtime/wsPublisher');
const logger = require('../../utils/logger');
const { claimIdempotency, storeIdempotencyResult, clearIdempotency } = require('../../utils/idempotency');

function sanitizeOptional(input) {
  if (!input) return null;
  return sanitizeText(input);
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

async function getCitizenComplaintDetail(complaintId, citizenId) {
  const complaint = await complaintsRepository.getCitizenComplaintById(complaintId, citizenId);
  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }
  const history = await complaintsRepository.getComplaintHistory(complaintId);
  return { complaint, history };
}

async function getAdminComplaintDetail(complaintId) {
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
  await publishComplaintStatusUpdate({
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
  assertComplaintAdminAccess(current, actorId, {
    allowUnassigned: false,
    actionLabel: 'reassign this complaint',
  });

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'assigned',
    allowedPreviousStatuses: [
      'submitted',
      'assigned',
      'in_review',
      'department_contact_identified',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'reassign this complaint',
    note: sanitizeText(reason),
    patch: {
      assigned_admin_id: adminId,
      status_reason: sanitizeText(reason),
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

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'call_scheduled',
    allowedPreviousStatuses: [
      'assigned',
      'in_review',
      'department_contact_identified',
      'call_scheduled',
      'followup_in_progress',
    ],
    actionLabel: 'schedule a call for this complaint',
    note: 'Follow-up call scheduled',
    patch: {
      call_scheduled_at: callScheduledAt,
      status_reason: 'Follow-up call scheduled',
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

  return complaint;
}

async function logComplaintCallOutcome(complaintId, actorId, callOutcome, reqMeta) {
  const current = await complaintsRepository.getComplaintById(complaintId);
  if (!current) {
    throw createHttpError(404, 'Complaint not found');
  }
  assertComplaintAdminAccess(current, actorId, { actionLabel: 'log a call outcome for this complaint' });

  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'followup_in_progress',
    allowedPreviousStatuses: ['call_scheduled', 'followup_in_progress'],
    actionLabel: 'log a call outcome for this complaint',
    note: sanitizeText(callOutcome),
    patch: {
      call_outcome: sanitizeText(callOutcome),
      status_reason: 'Call outcome logged',
    },
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_call_logged',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
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
      'submitted',
      'assigned',
      'in_review',
      'department_contact_identified',
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
  assertComplaintAdminAccess(complaint, actorId, { actionLabel: 'escalate this complaint to a meeting' });
  assertAllowedComplaintTransition(
    complaint.status,
    ['assigned', 'in_review', 'department_contact_identified', 'call_scheduled', 'followup_in_progress'],
    'escalate this complaint to a meeting',
  );

  const meeting = await meetingsRepository.createMeeting({
    citizenId: complaint.citizen_id,
    title: sanitizeText(complaint.title),
    purpose: sanitizeText(body.purpose),
    preferredTime: null,
    adminReferral: complaint.assignedAdminName || complaint.department || 'Admin escalation',
    documentFileId: null,
    additionalAttendees: [],
    linkedComplaintId: complaintId,
  });

  await complaintsRepository.updateComplaintStatus({
    complaintId,
    status: 'escalated_to_meeting',
    previousStatus: complaint.status,
    actorRole: 'admin',
    actorId,
    note: 'Complaint escalated to meeting',
    patch: {
      related_meeting_id: meeting.id,
      status_reason: 'Escalated to linked meeting',
    },
  });

  await publishComplaintStatusUpdate({
    citizenId: complaint.citizen_id,
    complaintId,
    status: 'escalated_to_meeting',
    note: 'Complaint escalated to meeting',
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: 'complaint_escalated_to_meeting',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { meetingId: meeting.id },
  });

  return { complaint: await complaintsRepository.getComplaintById(complaintId), meeting };
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
  logComplaintCallOutcome,
  resolveComplaint,
  escalateComplaintToMeeting,
  reopenComplaint,
  closeComplaint,
};
