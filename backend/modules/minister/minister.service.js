const redis = require('../../config/redis');
const ministerRepository = require('./minister.repository');
const appointmentsRepository = require('../appointments/appointments.repository');
const filesService = require('../files/files.service');

async function getCalendar(ministerId) {
  return ministerRepository.getCalendar(ministerId);
}

async function getScheduledGrievances() {
  return ministerRepository.getScheduledGrievances();
}

function cacheKey(appointmentId) {
  return `appointment:files:${appointmentId}`;
}

async function getAppointmentFiles(ministerId, appointmentId) {
  const allowed = await ministerRepository.hasCalendarAccessToAppointment(ministerId, appointmentId);
  if (!allowed) {
    const error = new Error('Appointment not found');
    error.status = 404;
    throw error;
  }

  const cached = await redis.get(cacheKey(appointmentId));
  const files = cached
    ? JSON.parse(cached)
    : await appointmentsRepository.listAppointmentFilesForMinister(appointmentId, ministerId);

  if (!cached) {
    const toCache = files.map(({ id, entity_type, original_name, mime_type, file_size, created_at }) => ({
      id, entity_type, original_name, mime_type, file_size, created_at,
    }));
    await redis.set(cacheKey(appointmentId), JSON.stringify(toCache), 'EX', 300);
  }

  const hydrated = await Promise.all(
    files.map(async (file) => {
      const signed = await filesService.createSignedFileAccess({
        fileId: file.id,
        actorRole: 'minister',
        actorId: ministerId,
        scope: { appointmentId },
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

async function getAppointmentPool() {
  const appointments = await appointmentsRepository.getAppointmentQueue();
  return { appointments };
}

module.exports = { getCalendar, getAppointmentFiles, getScheduledGrievances, getAppointmentPool };
