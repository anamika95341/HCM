const deoRepository = require('./deo.repository');
const adminRepository = require('../admin/admin.repository');
const createHttpError = require('http-errors');
const { sanitizeText } = require('../../utils/sanitize');
const { writeAuditLog } = require('../../utils/audit');
const filesRepository = require('../files/files.repository');

async function getAssignedMeetings(deoId) {
  return deoRepository.getAssignedMeetings(deoId);
}

function mapFileType(file) {
  if (file.entity_type === 'meeting_photo' || file.mime_type?.startsWith('image/')) return 'photo';
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

async function getCompletedMeetings(deoId) {
  const meetings = await deoRepository.getCompletedMeetings(deoId);
  return Promise.all(
    meetings.map(async (meeting) => {
      const [legacyFiles, uploadedFiles] = await Promise.all([
        deoRepository.listMeetingFilesForDeo(meeting.id),
        filesRepository.listFilesUploadedByActor('deo', meeting.assigned_deo_id || null, {
          contextType: 'meeting',
          contextId: meeting.id,
        }),
      ]);

      const files = [
        ...legacyFiles.map(mapManagedFile),
        ...uploadedFiles.map(mapManagedFile),
      ];

      return {
        ...meeting,
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

module.exports = { getAssignedMeetings, getCompletedMeetings, listMinisters, createCalendarEvent, getCalendarEvents };
