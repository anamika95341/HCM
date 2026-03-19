const pool = require('../../config/database');

async function createUploadedFile(file, context) {
  const result = await pool.query(
    `INSERT INTO uploaded_files
      (entity_type, entity_id, stored_name, original_name, mime_type, file_size, storage_path, uploaded_by_role, uploaded_by_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      context.entityType,
      context.entityId || null,
      file.storedName,
      file.originalName,
      file.mimeType,
      file.fileSize,
      file.storagePath,
      context.uploadedByRole,
      context.uploadedById,
    ]
  );
  return result.rows[0];
}

async function createMeeting({ citizenId, title, purpose, preferredTime, adminReferral, documentFileId, additionalAttendees }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const meetingResult = await client.query(
      `INSERT INTO meetings
        (citizen_id, title, purpose, preferred_time, admin_referral, document_file_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [citizenId, title, purpose, preferredTime || null, adminReferral || null, documentFileId || null]
    );
    const meeting = meetingResult.rows[0];

    for (const attendee of additionalAttendees) {
      await client.query(
        `INSERT INTO meeting_additional_attendees (meeting_id, attendee_name, attendee_phone)
         VALUES ($1,$2,$3)`,
        [meeting.id, attendee.attendeeName, attendee.attendeePhone]
      );
    }

    await client.query(
      `INSERT INTO meeting_status_history (meeting_id, new_status, actor_role, actor_id, note)
       VALUES ($1,'pending','citizen',$2,$3)`,
      [meeting.id, citizenId, 'Meeting request submitted']
    );

    await client.query('COMMIT');
    return meeting;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getCitizenMeetings(citizenId) {
  const result = await pool.query(
    `SELECT id, title, purpose, preferred_time, admin_referral, status, rejection_reason, verification_reason, scheduled_at, scheduled_location, is_vip, admin_comments, created_at
     FROM meetings
     WHERE citizen_id = $1
     ORDER BY created_at DESC`,
    [citizenId]
  );
  return result.rows;
}

async function getMeetingById(meetingId) {
  const result = await pool.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
  return result.rows[0] || null;
}

async function getCitizenMeetingById(meetingId, citizenId) {
  const result = await pool.query(
    `SELECT id, citizen_id, title, purpose, preferred_time, admin_referral, status, rejection_reason, verification_reason, scheduled_at, scheduled_location, is_vip, admin_comments, created_at
     FROM meetings WHERE id = $1 AND citizen_id = $2`,
    [meetingId, citizenId]
  );
  return result.rows[0] || null;
}

async function getMeetingQueue() {
  const result = await pool.query(
    `SELECT m.id, m.title, m.purpose, m.preferred_time, m.status, m.created_at, c.first_name, c.last_name, c.citizen_id
     FROM meetings m
     JOIN citizens c ON c.id = m.citizen_id
     WHERE m.status IN ('pending', 'accepted', 'verification_pending', 'verified')
     ORDER BY m.created_at ASC`
  );
  return result.rows;
}

async function updateMeetingStatus({ meetingId, status, previousStatus, actorRole, actorId, note, patch = {} }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sets = ['status = $2', 'updated_at = NOW()'];
    const values = [meetingId, status];
    let index = 3;
    for (const [column, value] of Object.entries(patch)) {
      sets.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }

    await client.query(`UPDATE meetings SET ${sets.join(', ')} WHERE id = $1`, values);
    await client.query(
      `INSERT INTO meeting_status_history (meeting_id, previous_status, new_status, actor_role, actor_id, note)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [meetingId, previousStatus, status, actorRole, actorId || null, note || null]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createCalendarEvent({ ministerId, meetingId, title, startsAt, endsAt, location, isVip, comments, createdByAdminId }) {
  const result = await pool.query(
    `INSERT INTO minister_calendar_events
      (minister_id, meeting_id, title, starts_at, ends_at, location, is_vip, comments, created_by_admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [ministerId, meetingId, title, startsAt, endsAt, location, isVip, comments || null, createdByAdminId]
  );
  return result.rows[0];
}

async function getMeetingHistory(meetingId) {
  const result = await pool.query(
    `SELECT previous_status, new_status, actor_role, note, created_at
     FROM meeting_status_history
     WHERE meeting_id = $1
     ORDER BY created_at ASC`,
    [meetingId]
  );
  return result.rows;
}

module.exports = {
  createUploadedFile,
  createMeeting,
  getCitizenMeetings,
  getMeetingById,
  getCitizenMeetingById,
  getMeetingQueue,
  updateMeetingStatus,
  createCalendarEvent,
  getMeetingHistory,
};
