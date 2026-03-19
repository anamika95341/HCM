const pool = require('../../config/database');

async function getAssignedMeetings(deoId) {
  const result = await pool.query(
    `SELECT m.id, m.purpose, m.status, m.created_at, c.first_name, c.last_name, c.mobile_number, c.email
     FROM meetings m
     JOIN citizens c ON c.id = m.citizen_id
     WHERE m.assigned_deo_id = $1 AND m.status = 'verification_pending'
     ORDER BY m.created_at ASC`,
    [deoId]
  );
  return result.rows;
}

module.exports = { getAssignedMeetings };
