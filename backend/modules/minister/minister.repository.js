const pool = require('../../config/database');

async function getCalendar(ministerId) {
  const result = await pool.query(
    `SELECT id, minister_id, meeting_id, title, who_to_meet, starts_at, ends_at, location, is_vip, comments, created_at, created_by_deo_id,
            CASE WHEN meeting_id IS NULL THEN 'deo_event' ELSE 'citizen_meeting' END AS calendar_kind,
            CASE WHEN meeting_id IS NULL THEN 'DEO Event' ELSE 'Citizen Meeting Workflow' END AS source_label
     FROM minister_calendar_events
     WHERE minister_id = $1
     ORDER BY starts_at ASC`,
    [ministerId]
  );
  return result.rows;
}

async function getAllCalendarEvents() {
  const result = await pool.query(
    `SELECT id, minister_id, meeting_id, title, who_to_meet, starts_at, ends_at, location, is_vip, comments, created_at, created_by_deo_id,
            CASE WHEN meeting_id IS NULL THEN 'deo_event' ELSE 'citizen_meeting' END AS calendar_kind,
            CASE WHEN meeting_id IS NULL THEN 'DEO Event' ELSE 'Citizen Meeting Workflow' END AS source_label
     FROM minister_calendar_events
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
