const pool = require('../../config/database');

async function getAssignedMeetings(deoId) {
  const result = await pool.query(
    `SELECT m.id, m.request_id, m.title, m.purpose, m.status, m.created_at, m.admin_comments, m.verification_reason, c.first_name, c.last_name, c.citizen_id, c.mobile_number, c.email
     FROM meetings m
     JOIN citizens c ON c.id = m.citizen_id
     WHERE m.assigned_deo_id = $1 AND m.status = 'verification_pending'
     ORDER BY m.updated_at DESC, m.created_at DESC`,
    [deoId]
  );
  return result.rows;
}

module.exports = { getAssignedMeetings };
