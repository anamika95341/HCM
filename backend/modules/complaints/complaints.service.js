const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const complaintsRepository = require('./complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const adminRepository = require('../admin/admin.repository');
const { persistPrivateUpload } = require('../../middleware/uploadHandler');
const { sanitizeText } = require('../../utils/sanitize');
const { writeAuditLog } = require('../../utils/audit');

async function withIdempotency(idempotencyKey, producer) {
  if (!idempotencyKey) {
    throw createHttpError(400, 'Idempotency-Key header is required');
  }
  const key = `idempotency:${idempotencyKey}`;
  const existing = await redis.get(key);
  if (existing) {
    return JSON.parse(existing);
  }
  const result = await producer();
  await redis.set(key, JSON.stringify(result), 'EX', 600);
  return result;
}

function sanitizeOptional(input) {
  if (!input) return null;
  return sanitizeText(input);
}

async function submitComplaint({ citizenId, body, file, reqMeta, idempotencyKey }) {
  return withIdempotency(idempotencyKey, async () => {
    let document = null;
    if (file) {
      const storedFile = await persistPrivateUpload(file, 'documents');
      document = await meetingsRepository.createUploadedFile(storedFile, {
        entityType: 'complaint_document',
        uploadedByRole: 'citizen',
        uploadedById: citizenId,
      });
    }

    const complaint = await complaintsRepository.createComplaint({
      citizenId,
      subject: sanitizeText(body.subject),
      description: sanitizeText(body.description),
      complaintLocation: sanitizeOptional(body.complaintLocation),
      complaintType: sanitizeOptional(body.complaintType),
      documentFileId: document?.id,
    });

    await writeAuditLog({
      actorRole: 'citizen',
      actorId: citizenId,
      entityType: 'complaint',
      entityId: complaint.id,
      action: 'complaint_submitted',
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    return { complaint };
  });
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

async function applyComplaintTransition({ complaintId, actorId, actorRole, nextStatus, note, patch = {} }) {
  const complaint = await complaintsRepository.getComplaintById(complaintId);
  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
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

  return complaintsRepository.getComplaintById(complaintId);
}

async function assignComplaintToSelf(complaintId, adminId, reqMeta) {
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId: adminId,
    actorRole: 'admin',
    nextStatus: 'assigned',
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
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'assigned',
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

async function updateComplaintDepartment(complaintId, actorId, body, reqMeta) {
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'department_contact_identified',
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
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'call_scheduled',
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
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'followup_in_progress',
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
  const docNames = (body.resolutionDocs || []).map((doc) => sanitizeText(doc.name)).filter(Boolean);
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'resolved',
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
  const reopenedCount = (current?.reopenedCount || 0) + 1;
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'assigned',
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
  const complaint = await applyComplaintTransition({
    complaintId,
    actorId,
    actorRole: 'admin',
    nextStatus: 'completed',
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
  updateComplaintDepartment,
  scheduleComplaintCall,
  logComplaintCallOutcome,
  resolveComplaint,
  escalateComplaintToMeeting,
  reopenComplaint,
  closeComplaint,
};
