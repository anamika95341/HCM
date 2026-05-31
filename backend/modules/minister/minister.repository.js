const pool = require('../../config/database');

async function getCalendar(ministerId) {
  const result = await pool.query(
    `SELECT mce.id, mce.appointment_id, mce.title, mce.who_to_meet, mce.starts_at, mce.ends_at, mce.location, mce.is_vip, mce.comments, mce.created_at, mce.created_by_deo_id,
            m.status AS appointment_status
       FROM minister_calendar_events mce
       LEFT JOIN appointments m ON m.id = mce.appointment_id
      WHERE mce.minister_id = $1
     ORDER BY starts_at ASC`,
    [ministerId]
  );
  return result.rows;
}

async function getScheduledGrievances() {
  const result = await pool.query(
    `SELECT
       g.id,
       g.grievance_id,
       g.subject,
       g.description,
       g.call_scheduled_at,
       g.status,
       g.department,
       g.state,
       g.district,
       citizen.first_name AS citizen_first_name,
       citizen.last_name  AS citizen_last_name,
       citizen.mobile_number
     FROM grievances g
     LEFT JOIN citizens citizen ON citizen.id = g.citizen_id
     WHERE g.call_scheduled_at IS NOT NULL
       AND g.status NOT IN ('resolved', 'closed')
     ORDER BY g.call_scheduled_at ASC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    grievanceId: row.grievance_id,
    title: row.subject,
    details: row.description,
    callScheduledAt: row.call_scheduled_at,
    status: row.status,
    department: row.department,
    state: row.state,
    district: row.district,
    citizenName: [row.citizen_first_name, row.citizen_last_name].filter(Boolean).join(' ') || '',
    citizenPhone: row.mobile_number || '',
  }));
}

async function hasCalendarAccessToAppointment(ministerId, appointmentId) {
  const result = await pool.query(
    `SELECT 1
       FROM minister_calendar_events
      WHERE minister_id = $1
        AND appointment_id = $2
      LIMIT 1`,
    [ministerId, appointmentId]
  );
  return Boolean(result.rows[0]);
}

module.exports = { getCalendar, hasCalendarAccessToAppointment, getScheduledGrievances };
