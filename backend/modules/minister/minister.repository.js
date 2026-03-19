const pool = require('../../config/database');

async function getCalendar(ministerId) {
  const result = await pool.query(
    `SELECT id, meeting_id, title, starts_at, ends_at, location, is_vip, comments, created_at
     FROM minister_calendar_events
     WHERE minister_id = $1
     ORDER BY starts_at ASC`,
    [ministerId]
  );
  return result.rows;
}

module.exports = { getCalendar };
