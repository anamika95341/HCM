const deoRepository = require('./deo.repository');
const adminRepository = require('../admin/admin.repository');
const createHttpError = require('http-errors');
const { sanitizeText } = require('../../utils/sanitize');
const { writeAuditLog } = require('../../utils/audit');

async function getAssignedMeetings(deoId) {
  return deoRepository.getAssignedMeetings(deoId);
}

function mapFileType(file) {
  if (file.entity_type === 'meeting_photo' || file.mime_type?.startsWith('image/')) return 'photo';
  if (file.mime_type?.startsWith('video/')) return 'video';
  return 'document';
}

function formatFileSize(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

async function getCompletedMeetings() {
  const meetings = await deoRepository.getCompletedMeetings();
  return Promise.all(
    meetings.map(async (meeting) => {
      const files = await deoRepository.listMeetingFilesForDeo(meeting.id);
      return {
        ...meeting,
        files: files.map((file) => ({
          id: file.id,
          name: file.original_name,
          type: mapFileType(file),
          size: formatFileSize(file.file_size),
          mimeType: file.mime_type,
          createdAt: file.created_at,
          kind: file.entity_type,
        })),
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
  return deoRepository.listCalendarEventsByDeo(deoId);
}

module.exports = { getAssignedMeetings, getCompletedMeetings, listMinisters, createCalendarEvent, getCalendarEvents };
