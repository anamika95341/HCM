const redis = require('../config/redis');
const events = require('./wsEvents');

async function publishMeetingStatusUpdate({ citizenId, meetingId, status, note }) {
  await redis.publish(
    `citizen:${citizenId}`,
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
    `citizen:${citizenId}`,
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

async function publishNotificationCreated({ citizenId, notification, unreadCount }) {
  await redis.publish(
    `citizen:${citizenId}`,
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
  publishMeetingStatusUpdate,
  publishComplaintStatusUpdate,
  publishNotificationCreated,
};
