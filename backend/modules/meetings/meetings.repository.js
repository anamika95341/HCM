const pool = require('../../config/database');
const { generateCaseCode } = require('../../utils/generateCaseCode');
const logger = require('../../utils/logger');

const meetingSelect = `
  SELECT
    m.id,
    m.request_id,
    m.citizen_id,
    m.assigned_admin_id,
    m.assigned_deo_id,
    m.minister_id,
    m.linked_complaint_id,
    m.title,
    m.purpose,
    m.preferred_time,
    m.admin_referral,
    m.status,
    m.rejection_reason,
    m.verification_reason,
    m.verification_notes,
    m.scheduled_at,
    m.scheduled_end_at,
    m.scheduled_location,
    m.is_vip,
    m.admin_comments,
    m.visitor_id,
    m.meeting_docket,
    m.completion_note,
    m.cancellation_reason,
    m.created_at,
    m.updated_at,
    citizen.first_name,
    citizen.last_name,
    citizen.citizen_id AS citizen_code,
    citizen.mobile_number,
    citizen.email,
    admin.first_name AS admin_first_name,
    admin.last_name AS admin_last_name,
    deo.first_name AS deo_first_name,
    deo.last_name AS deo_last_name,
    complaint.complaint_id AS linked_complaint_code,
    complaint.subject AS linked_complaint_subject
  FROM meetings m
  JOIN citizens citizen ON citizen.id = m.citizen_id
  LEFT JOIN admins admin ON admin.id = m.assigned_admin_id
  LEFT JOIN deos deo ON deo.id = m.assigned_deo_id
  LEFT JOIN complaints complaint ON complaint.id = m.linked_complaint_id
`;

function mapMeeting(row) {
  return {
    id: row.id,
    _id: row.id,
    requestId: row.request_id,
    citizen_id: row.citizen_id,
    assignedAdminUserId: row.assigned_admin_id,
    assignedDeoId: row.assigned_deo_id,
    ministerId: row.minister_id,
    title: row.title,
    purpose: row.purpose,
    preferred_time: row.preferred_time,
    admin_referral: row.admin_referral,
    status: row.status,
    rejection_reason: row.rejection_reason,
    verification_reason: row.verification_reason,
    verification_notes: row.verification_notes,
    scheduled_at: row.scheduled_at,
    scheduled_end_at: row.scheduled_end_at,
    scheduled_location: row.scheduled_location,
    is_vip: row.is_vip,
    admin_comments: row.admin_comments,
    visitorId: row.visitor_id,
    meetingDocket: row.meeting_docket,
    completionNote: row.completion_note,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    first_name: row.first_name,
    last_name: row.last_name,
    citizen_code: row.citizen_code,
    mobile_number: row.mobile_number,
    email: row.email,
    assignedAdminName: [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ') || '',
    assignedDeoName: [row.deo_first_name, row.deo_last_name].filter(Boolean).join(' ') || '',
    currentOwner: [row.deo_first_name, row.deo_last_name].filter(Boolean).join(' ')
      || [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ')
      || 'Meeting Pool',
    citizenSnapshot: {
      name: [row.first_name, row.last_name].filter(Boolean).join(' '),
      citizenId: row.citizen_code,
      phoneNumbers: row.mobile_number ? [row.mobile_number] : [],
      email: row.email || '',
    },
    relatedComplaint: row.linked_complaint_id
      ? { id: row.linked_complaint_id, complaintId: row.linked_complaint_code, title: row.linked_complaint_subject }
      : null,
  };
}

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

async function createMeeting({
  citizenId,
  title,
  purpose,
  preferredTime,
  adminReferral,
  documentFileId,
  additionalAttendees,
  linkedComplaintId = null,
}) {
  const client = await pool.connect();
  try {
    logger.info('Creating meeting record', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      attendeeCount: Array.isArray(additionalAttendees) ? additionalAttendees.length : 0,
    });
    await client.query('BEGIN');
    const requestId = generateCaseCode('MREQ');
    const meetingResult = await client.query(
      `INSERT INTO meetings
        (request_id, citizen_id, title, purpose, preferred_time, admin_referral, document_file_id, linked_complaint_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [requestId, citizenId, title, purpose, preferredTime || null, adminReferral || null, documentFileId || null, linkedComplaintId]
    );
    const meeting = meetingResult.rows[0];

    if (documentFileId) {
      await client.query(
        `UPDATE uploaded_files
            SET entity_id = $2
          WHERE id = $1`,
        [documentFileId, meeting.id]
      );
    }

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
    logger.info('Meeting record created', {
      meetingId: meeting.id,
      requestId: meeting.request_id,
      citizenId,
    });
    return meeting;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Meeting creation failed', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getCitizenMeetings(citizenId) {
  const result = await pool.query(
    `${meetingSelect}
     WHERE m.citizen_id = $1
     ORDER BY m.updated_at DESC, m.created_at DESC`,
    [citizenId]
  );
  return result.rows.map(mapMeeting);
}

async function getMeetingById(meetingId) {
  const result = await pool.query(
    `${meetingSelect}
     WHERE m.id = $1`,
    [meetingId]
  );
  return result.rows[0] ? mapMeeting(result.rows[0]) : null;
}

async function getCitizenMeetingById(meetingId, citizenId) {
  const result = await pool.query(
    `${meetingSelect}
     WHERE m.id = $1 AND m.citizen_id = $2`,
    [meetingId, citizenId]
  );
  return result.rows[0] ? mapMeeting(result.rows[0]) : null;
}

async function getMeetingQueue() {
  const result = await pool.query(
    `${meetingSelect}
     WHERE m.status NOT IN ('completed', 'cancelled')
     ORDER BY m.updated_at DESC, m.created_at DESC`
  );
  return result.rows.map(mapMeeting);
}

async function getAdminMeetingById(meetingId) {
  const result = await pool.query(
    `${meetingSelect}
     WHERE m.id = $1`,
    [meetingId]
  );
  return result.rows[0] ? mapMeeting(result.rows[0]) : null;
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

async function updateCalendarEventByMeetingId(meetingId, payload) {
  const result = await pool.query(
    `UPDATE minister_calendar_events
     SET minister_id = $2,
         title = $3,
         starts_at = $4,
         ends_at = $5,
         location = $6,
         is_vip = $7,
         comments = $8
     WHERE meeting_id = $1
     RETURNING *`,
    [
      meetingId,
      payload.ministerId,
      payload.title,
      payload.startsAt,
      payload.endsAt,
      payload.location,
      payload.isVip,
      payload.comments || null,
    ]
  );
  return result.rows[0] || null;
}

async function getMeetingHistory(meetingId) {
  const result = await pool.query(
    `SELECT id, previous_status, new_status, actor_role, note, created_at
     FROM meeting_status_history
     WHERE meeting_id = $1
     ORDER BY created_at ASC`,
    [meetingId]
  );
  return result.rows;
}

async function listMeetingFilesForMinister(meetingId, ministerId) {
  const result = await pool.query(
    `SELECT uf.id, uf.entity_type, uf.original_name, uf.mime_type, uf.file_size, uf.created_at, uf.storage_path
       FROM minister_calendar_events mce
       JOIN meetings m ON m.id = mce.meeting_id
       JOIN uploaded_files uf
         ON (
              (uf.id = m.document_file_id AND uf.mime_type LIKE 'image/%')
              OR
              (uf.entity_id = m.id AND uf.entity_type = 'meeting_photo')
            )
      WHERE mce.meeting_id = $1
        AND mce.minister_id = $2
      ORDER BY uf.created_at ASC`,
    [meetingId, ministerId]
  );
  return result.rows;
}

async function listMeetingFilesForAdmin(meetingId, adminId) {
  const result = await pool.query(
    `SELECT uf.id, uf.entity_type, uf.original_name, uf.mime_type, uf.file_size, uf.created_at, uf.storage_path
       FROM meetings m
       JOIN uploaded_files uf
         ON (
              (uf.id = m.document_file_id AND uf.mime_type LIKE 'image/%')
              OR
              (uf.entity_id = m.id AND uf.entity_type = 'meeting_photo')
            )
      WHERE m.id = $1
        AND m.assigned_admin_id = $2
      ORDER BY uf.created_at ASC`,
    [meetingId, adminId]
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
  getAdminMeetingById,
  updateMeetingStatus,
  createCalendarEvent,
  updateCalendarEventByMeetingId,
  getMeetingHistory,
  listMeetingFilesForMinister,
  listMeetingFilesForAdmin,
};
