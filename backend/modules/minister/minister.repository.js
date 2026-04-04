const pool = require('../../config/database');

async function getCalendar(ministerId) {
  const result = await pool.query(
    `SELECT id, meeting_id, title, who_to_meet, starts_at, ends_at, location, is_vip, comments, created_at, created_by_deo_id
     FROM minister_calendar_events
     WHERE minister_id = $1
     ORDER BY starts_at ASC`,
    [ministerId]
  );
  return result.rows;
}

async function hasCalendarAccessToMeeting(ministerId, meetingId) {
  const result = await pool.query(
    `SELECT 1
       FROM minister_calendar_events
      WHERE minister_id = $1
        AND meeting_id = $2
      LIMIT 1`,
    [ministerId, meetingId]
  );
  return Boolean(result.rows[0]);
}

module.exports = { getCalendar, hasCalendarAccessToMeeting };
