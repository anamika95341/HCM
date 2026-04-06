const redis = require('../config/redis');
const events = require('./wsEvents');

function buildChannel(recipientRole, recipientId) {
  return `${recipientRole}:${recipientId}`;
}

async function publishMeetingStatusUpdate({ citizenId, meetingId, status, note }) {
  await redis.publish(
    buildChannel('citizen', citizenId),
    JSON.stringify({
      event: events.MEETING_STATUS_UPDATED,
      payload: {
        citizenId,
        meetingId,
        status,
        note,
        timestamp: new Date().toISOString(),
      },
    })
  );
}

async function publishComplaintStatusUpdate({ citizenId, complaintId, status, note }) {
  await redis.publish(
    buildChannel('citizen', citizenId),
    JSON.stringify({
      event: events.COMPLAINT_STATUS_UPDATED,
      payload: {
        citizenId,
        complaintId,
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
  publishMeetingStatusUpdate,
  publishComplaintStatusUpdate,
  publishNotificationCreated,
};
