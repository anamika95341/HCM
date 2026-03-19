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

module.exports = { publishMeetingStatusUpdate };
