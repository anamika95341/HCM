const redis = require('../config/redis');
const events = require('./wsEvents');

function buildChannel(recipientRole, recipientId) {
  return `${recipientRole}:${recipientId}`;
}

async function publishAppointmentStatusUpdate({ citizenId, appointmentId, status, note }) {
  await redis.publish(
    buildChannel('citizen', citizenId),
    JSON.stringify({
      event: events.APPOINTMENT_STATUS_UPDATED,
      payload: {
        citizenId,
        appointmentId,
        status,
        note,
        timestamp: new Date().toISOString(),
      },
    })
  );
}

async function publishGrievanceStatusUpdate({ citizenId, grievanceId, status, note }) {
  await redis.publish(
    buildChannel('citizen', citizenId),
    JSON.stringify({
      event: events.GRIEVANCE_STATUS_UPDATED,
      payload: {
        citizenId,
        grievanceId,
        status,
        note,
        timestamp: new Date().toISOString(),
      },
    })
  );
}

async function publishNotificationCreated({ recipientRole, recipientId, notification, unreadCount }) {
  await redis.publish(
    buildChannel(recipientRole, recipientId),
    JSON.stringify({
      event: events.NOTIFICATION_CREATED,
      payload: {
        notification,
        unreadCount,
        timestamp: new Date().toISOString(),
      },
    })
  );
}

module.exports = {
  buildChannel,
  publishAppointmentStatusUpdate,
  publishGrievanceStatusUpdate,
  publishNotificationCreated,
};
