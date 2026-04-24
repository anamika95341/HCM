const redis = require('../../config/redis');
const ministerRepository = require('./minister.repository');
const complaintsRepository = require('../complaints/complaints.repository');
const meetingsRepository = require('../meetings/meetings.repository');
const filesService = require('../files/files.service');

async function getCalendar(ministerId) {
  const [ministerCalendarEvents, complaintCalendarEvents] = await Promise.all([
    ministerRepository.getCalendar(ministerId),
    complaintsRepository.listScheduledComplaintCalendarEvents(),
  ]);

  return [...ministerCalendarEvents, ...complaintCalendarEvents].sort(
    (left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()
  );
}

function cacheKey(meetingId) {
  return `meeting:files:${meetingId}`;
}

async function getMeetingFiles(ministerId, meetingId) {
  const allowed = await ministerRepository.hasCalendarAccessToMeeting(ministerId, meetingId);
  if (!allowed) {
    const error = new Error('Meeting not found');
    error.status = 404;
    throw error;
  }

  const cached = await redis.get(cacheKey(meetingId));
  const files = cached
    ? JSON.parse(cached)
    : await meetingsRepository.listMeetingFilesForMinister(meetingId, ministerId);

  if (!cached) {
    const toCache = files.map(({ id, entity_type, original_name, mime_type, file_size, created_at }) => ({
      id, entity_type, original_name, mime_type, file_size, created_at,
    }));
    await redis.set(cacheKey(meetingId), JSON.stringify(toCache), 'EX', 300);
  }

  const hydrated = await Promise.all(
    files.map(async (file) => {
      const signed = await filesService.createSignedFileAccess({
        fileId: file.id,
        actorRole: 'minister',
        actorId: ministerId,
        scope: { meetingId },
      });

      return {
        id: file.id,
        name: file.original_name,
        mimeType: file.mime_type,
        size: file.file_size,
        createdAt: file.created_at,
        kind: file.entity_type,
        previewUrl: signed.url,
        downloadUrl: signed.url,
      };
    })
  );

  return { files: hydrated };
}

module.exports = { getCalendar, getMeetingFiles };
