const deoRepository = require('./deo.repository');
const adminRepository = require('../admin/admin.repository');
const createHttpError = require('http-errors');
const { sanitizeText } = require('../../utils/sanitize');
const { writeAuditLog } = require('../../utils/audit');
const filesRepository = require('../files/files.repository');
const filesService = require('../files/files.service');
const { notifyMinisterAppointmentScheduled } = require('../notifications/notifications.service');

async function getAssignedAppointments(deoId) {
  return deoRepository.getAssignedAppointments(deoId);
}

function mapFileType(file) {
  if (file.entity_type === 'appointment_photo' || file.mime_type?.startsWith('image/')) return 'photo';
  if (file.mime_type?.startsWith('video/')) return 'video';
  return 'document';
}

function mapManagedFile(file) {
  return {
    id: file.id,
    name: file.original_name,
    type: mapFileType(file),
    size: formatFileSize(file.file_size || file.size),
    mimeType: file.mime_type,
    createdAt: file.created_at,
    kind: file.entity_type || file.file_category || 'document',
  };
}

function formatFileSize(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

async function getCompletedAppointments(deoId, reqMeta) {
  const appointments = await deoRepository.getCompletedAppointments();
  return Promise.all(
    appointments.map(async (appointment) => {
      const [legacyFiles, uploadedFiles, citizenFiles] = await Promise.all([
        deoRepository.listAppointmentFilesForDeo(appointment.id),
        filesRepository.listFilesForContext('deo', {
          contextType: 'appointment',
          contextId: appointment.id,
        }),
        filesService.listCitizenFilesForContext({
          contextType: 'appointment',
          contextId: appointment.id,
          reqMeta,
        }),
      ]);

      const files = [
        ...citizenFiles.map((file) => ({
          id: file.id,
          name: file.name,
          type: mapFileType({ mime_type: file.mimeType, entity_type: file.fileCategory }),
          size: formatFileSize(file.size),
          mimeType: file.mimeType,
          createdAt: file.createdAt,
          kind: file.fileCategory || 'document',
          uploadedBy: 'citizen',
          downloadUrl: file.downloadUrl,
        })),
        ...legacyFiles.map(mapManagedFile),
        ...uploadedFiles.map(mapManagedFile),
      ];

      return {
        ...appointment,
        files,
      };
    })
  );
}

async function listMinisters() {
  return deoRepository.listActiveMinisters();
}

async function createCalendarEvent(deoId, body, reqMeta) {
  const minister = await adminRepository.findActiveMinisterById(body.ministerId);
  if (!minister) {
    throw createHttpError(404, 'Minister not found');
  }

  const event = await deoRepository.createCalendarEvent({
    deoId,
    ministerId: body.ministerId,
    title: sanitizeText(body.title),
    whoToMeet: sanitizeText(body.whoToMeet || ''),
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: sanitizeText(body.location),
    comments: sanitizeText(body.description || ''),
  });

  await writeAuditLog({
    actorRole: 'deo',
    actorId: deoId,
    entityType: 'minister_calendar_event',
    entityId: event.id,
    action: 'deo_calendar_event_created',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
    metadata: { ministerId: body.ministerId },
  });

  await notifyMinisterAppointmentScheduled({
    ministerId: body.ministerId,
    appointmentId: event.id,
    appointmentTitle: event.title,
    scheduledAt: body.startsAt,
    location: sanitizeText(body.location),
    adminId: null,
    isRescheduled: false,
    source: 'deo_calendar_event',
    entityType: 'minister_calendar_event',
  });

  return event;
}

async function getCalendarEvents(deoId) {
  const events = await deoRepository.listCalendarEventsByDeo(deoId);
  return Promise.all(
    events.map(async (event) => {
      const files = await filesRepository.listFilesUploadedByActor('deo', deoId, {
        contextType: 'event',
        contextId: event.id,
      });

      return {
        ...event,
        files: files.map(mapManagedFile),
      };
    })
  );
}

async function getGrievancesForDeo() {
  const grievancesRepository = require('../grievances/grievances.repository');
  return grievancesRepository.getSubmittedGrievancesForDeo();
}

async function submitGrievanceForCitizen({ deoId, body, documentFiles = [], letterheadFiles = [] }) {
  const grievancesRepository = require('../grievances/grievances.repository');
  const appointmentsRepository = require('../appointments/appointments.repository');
  const { persistPrivateUpload } = require('../../middleware/uploadHandler');

  if (!letterheadFiles.length) throw createHttpError(400, 'Letterhead file is required');
  if (!body.office || !body.office.trim()) throw createHttpError(400, 'Office is required');
  if (!body.citizenName || !body.citizenName.trim()) throw createHttpError(400, 'Citizen name is required');

  // Upload document files first to get the primary ID, then link all to the grievance after creation
  const documentFileRecords = [];
  for (const file of documentFiles) {
    const stored = await persistPrivateUpload(file, 'documents');
    const record = await appointmentsRepository.createUploadedFile(stored, {
      entityType: 'grievance_document',
      uploadedByRole: 'deo',
      uploadedById: deoId,
    });
    documentFileRecords.push(record);
  }

  const createdGrievance = await grievancesRepository.createGrievance({
    citizenId: null,
    citizenName: sanitizeText(body.citizenName),
    citizenPhone: body.mobileNumber ? sanitizeText(body.mobileNumber) : null,
    subject: sanitizeText(body.subject),
    description: sanitizeText(body.description),
    state: sanitizeText(body.state),
    district: sanitizeText(body.district),
    incidentDate: body.incidentDate || null,
    documentFileId: documentFileRecords[0]?.id || null,
    actorRole: 'deo',
    actorId: deoId,
  });

  // Link all document files to the grievance so the CM admin can see all of them
  if (documentFileRecords.length) {
    await appointmentsRepository.linkUploadedFilesToEntity(
      documentFileRecords.map((r) => r.id),
      createdGrievance.id
    );
  }

  // Persist all letterhead files; use first one for updateGrievanceLetterhead
  let primaryLetterheadId = null;
  for (const [i, file] of letterheadFiles.entries()) {
    const stored = await persistPrivateUpload(file, 'documents');
    const record = await appointmentsRepository.createUploadedFile(stored, {
      entityType: 'grievance_letterhead',
      entityId: createdGrievance.id,
      uploadedByRole: 'deo',
      uploadedById: deoId,
    });
    if (i === 0) primaryLetterheadId = record.id;
  }

  await grievancesRepository.updateGrievanceLetterhead({
    grievanceId: createdGrievance.id,
    deoId,
    office: sanitizeText(body.office),
    fileId: primaryLetterheadId,
  });

  const cmAdmin = await adminRepository.findChiefMinisterAdmin();
  if (cmAdmin) {
    await grievancesRepository.updateGrievanceStatus({
      grievanceId: createdGrievance.id,
      status: 'assigned',
      previousStatus: 'submitted',
      actorRole: 'system',
      actorId: null,
      note: 'Submitted by DEO — auto-assigned to Chief Minister admin',
      patch: { assigned_admin_id: cmAdmin.id },
    });
  }

  await writeAuditLog({
    actorRole: 'deo',
    actorId: deoId,
    entityType: 'grievance',
    entityId: createdGrievance.id,
    action: 'grievance_submitted_by_deo',
    metadata: { citizenName: sanitizeText(body.citizenName), mobileNumber: body.mobileNumber || null },
  });

  return { grievanceId: createdGrievance.grievance_id, message: 'Grievance submitted successfully' };
}

async function getAppointmentDetailForDeo(appointmentId, deoId, reqMeta) {
  const row = await deoRepository.getAssignedAppointmentDetail(appointmentId, deoId);
  if (!row) {
    throw createHttpError(404, 'Appointment not found');
  }

  const files = await filesService.listCitizenFilesForContext({
    contextType: 'appointment',
    contextId: appointmentId,
    reqMeta,
  });

  const adminName = [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ');

  return {
    id: row.id,
    requestId: row.request_id,
    title: row.title,
    purpose: row.purpose,
    description: row.purpose,
    status: row.status,
    createdAt: row.created_at,
    adminComments: row.admin_comments,
    verificationReason: row.verification_reason,
    citizenName: [row.first_name, row.last_name].filter(Boolean).join(' '),
    citizenCode: row.citizen_id,
    mobileNumber: row.mobile_number,
    email: row.email,
    state: row.citizen_state,
    district: row.citizen_city,
    verificationAdmin: adminName ? `${adminName}${row.admin_designation ? ` · ${row.admin_designation}` : ''}` : '',
    files,
  };
}

async function getGrievanceDetailForDeo(grievanceId, reqMeta) {
  const grievancesRepository = require('../grievances/grievances.repository');
  const grievance = await grievancesRepository.getGrievanceById(grievanceId);
  if (!grievance) {
    throw createHttpError(404, 'Grievance not found');
  }

  const citizenFiles = await filesService.listCitizenFilesForContext({
    contextType: 'grievance',
    contextId: grievanceId,
    reqMeta,
  });

  grievance.files = citizenFiles;
  return grievance;
}

module.exports = { getAssignedAppointments, getAppointmentDetailForDeo, getCompletedAppointments, listMinisters, createCalendarEvent, getCalendarEvents, getGrievancesForDeo, getGrievanceDetailForDeo, submitGrievanceForCitizen };
