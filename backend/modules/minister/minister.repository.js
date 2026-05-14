const pool = require('../../config/database');

async function getCalendar(ministerId) {
  const result = await pool.query(
    `SELECT mce.id, mce.meeting_id, mce.title, mce.who_to_meet, mce.starts_at, mce.ends_at, mce.location, mce.is_vip, mce.comments, mce.created_at, mce.created_by_deo_id,
            m.status AS meeting_status
       FROM minister_calendar_events mce
       LEFT JOIN meetings m ON m.id = mce.meeting_id
      WHERE mce.minister_id = $1
     ORDER BY starts_at ASC`,
    [ministerId]
  );
  return result.rows;
}

async function getAllCalendarEvents() {
  const result = await pool.query(
    `SELECT mce.id, mce.meeting_id, mce.title, mce.who_to_meet, mce.starts_at, mce.ends_at, mce.location, mce.is_vip, mce.comments, mce.created_at, mce.created_by_deo_id,
            m.status AS meeting_status
       FROM minister_calendar_events mce
       LEFT JOIN meetings m ON m.id = mce.meeting_id
      ORDER BY starts_at ASC`
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

module.exports = { getCalendar, getAllCalendarEvents, hasCalendarAccessToMeeting };
