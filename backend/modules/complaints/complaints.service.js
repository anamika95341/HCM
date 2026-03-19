const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const complaintsRepository = require('./complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
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

async function updateComplaintStatus(complaintId, actorId, status, note, reqMeta) {
  const complaint = await complaintsRepository.getComplaintById(complaintId);
  if (!complaint) {
    throw createHttpError(404, 'Complaint not found');
  }
  await complaintsRepository.updateComplaintStatus({
    complaintId,
    status,
    previousStatus: complaint.status,
    actorRole: 'admin',
    actorId,
    note: sanitizeText(note),
  });
  await writeAuditLog({
    actorRole: 'admin',
    actorId,
    entityType: 'complaint',
    entityId: complaintId,
    action: `complaint_${status}`,
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
  return complaintsRepository.getComplaintById(complaintId);
}

module.exports = { submitComplaint, getCitizenComplaints, getCitizenComplaintDetail, updateComplaintStatus };
