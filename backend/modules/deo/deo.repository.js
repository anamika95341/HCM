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

async function getCompletedMeetings() {
  const result = await pool.query(
    `SELECT m.id, m.request_id, m.title, m.purpose, m.status, m.created_at, m.completed_at, m.completion_note, m.admin_comments, m.scheduled_at, m.scheduled_location, m.assigned_deo_id, c.first_name, c.last_name, c.citizen_id, c.mobile_number, c.email
     FROM meetings m
     JOIN citizens c ON c.id = m.citizen_id
     WHERE m.status = 'completed'
     ORDER BY m.completed_at DESC NULLS LAST, m.updated_at DESC, m.created_at DESC`
    
  );
  return result.rows;
}

async function listActiveMinisters() {
  const result = await pool.query(
    `SELECT id, first_name, last_name
       FROM ministers
      WHERE status = 'active'
      ORDER BY first_name ASC, last_name ASC`
  );
  return result.rows;
}

async function createCalendarEvent({ deoId, ministerId, title, whoToMeet, startsAt, endsAt, location, comments }) {
  const result = await pool.query(
    `INSERT INTO minister_calendar_events
      (minister_id, title, who_to_meet, starts_at, ends_at, location, comments, created_by_deo_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, minister_id, title, who_to_meet, starts_at, ends_at, location, is_vip, comments, created_at`,
    [ministerId, title, whoToMeet || null, startsAt, endsAt, location, comments || null, deoId]
  );
  return result.rows[0];
}

async function listCalendarEventsByDeo(deoId) {
  const result = await pool.query(
    `SELECT mce.id, mce.minister_id, mce.title, mce.who_to_meet, mce.starts_at, mce.ends_at, mce.location, mce.is_vip, mce.comments, mce.created_at,
            mn.first_name AS minister_first_name, mn.last_name AS minister_last_name
       FROM minister_calendar_events mce
       JOIN ministers mn ON mn.id = mce.minister_id
      WHERE mce.created_by_deo_id = $1
        AND mce.meeting_id IS NULL
      ORDER BY mce.starts_at DESC, mce.created_at DESC`,
    [deoId]
  );
  return result.rows;
}

async function listMeetingFilesForDeo(meetingId) {
  const result = await pool.query(
    `SELECT uf.id, uf.entity_type, uf.original_name, uf.mime_type, uf.file_size, uf.created_at
       FROM meetings m
       JOIN uploaded_files uf
         ON (
              (uf.id = m.document_file_id)
              OR
              (uf.entity_id = m.id AND uf.entity_type = 'meeting_photo')
            )
      WHERE m.id = $1
        AND m.status = 'completed'
      ORDER BY uf.created_at ASC`,
    [meetingId]
  );
  return result.rows;
}

module.exports = {
  getAssignedMeetings,
  getCompletedMeetings,
  listActiveMinisters,
  createCalendarEvent,
  listCalendarEventsByDeo,
  listMeetingFilesForDeo,
};
