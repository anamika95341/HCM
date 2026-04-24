const pool = require('../../config/database');

async function findUploadedFileById(fileId) {
  const result = await pool.query(
    `SELECT id, entity_type, entity_id, stored_name, original_name, mime_type, file_size, storage_path, created_at
       FROM uploaded_files
      WHERE id = $1`,
    [fileId]
  );
  return result.rows[0] || null;
}

async function findFileByS3Key(s3Key) {
  const result = await pool.query(
    `SELECT id, s3_key, uploaded_by, uploader_role, visible_to_role, original_name, mime_type,
            file_category, size, context_type, context_id, status, created_at
       FROM files
      WHERE s3_key = $1`,
    [s3Key]
  );
  return result.rows[0] || null;
}

async function createFile(record) {
  const result = await pool.query(
    `INSERT INTO files
      (s3_key, uploaded_by, uploader_role, visible_to_role, original_name, mime_type, file_category, size, context_type, context_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, s3_key, uploaded_by, uploader_role, visible_to_role, original_name, mime_type,
               file_category, size, context_type, context_id, status, created_at`,
    [
      record.s3Key,
      record.uploadedBy,
      record.uploaderRole,
      record.visibleToRole,
      record.originalName,
      record.mimeType,
      record.fileCategory,
      record.size,
      record.contextType,
      record.contextId || null,
      record.status || 'pending',
    ]
  );
  return result.rows[0];
}

async function findFileRecordById(fileId) {
  const result = await pool.query(
    `SELECT id, s3_key, uploaded_by, uploader_role, visible_to_role, original_name, mime_type,
            file_category, size, context_type, context_id, status, created_at
       FROM files
      WHERE id = $1`,
    [fileId]
  );
  return result.rows[0] || null;
}

async function listFilesVisibleToRole(visibleToRole, filters = {}) {
  const values = [visibleToRole];
  const where = [Array.isArray(visibleToRole) ? 'visible_to_role = ANY($1)' : 'visible_to_role = $1'];
  let index = 2;

  if (filters.contextType) {
    where.push(`context_type = $${index}`);
    values.push(filters.contextType);
    index += 1;
  }

  if (filters.contextId) {
    where.push(`context_id = $${index}`);
    values.push(filters.contextId);
    index += 1;
  }

  if (filters.status) {
    where.push(`status = $${index}`);
    values.push(filters.status);
    index += 1;
  }

  const result = await pool.query(
    `SELECT id, s3_key, uploaded_by, uploader_role, visible_to_role, original_name, mime_type,
            file_category, size, context_type, context_id, status, created_at
       FROM files
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC`,
    values
  );

  return result.rows;
}

async function getCitizenMeetingById(meetingId, citizenId) {
  const result = await pool.query(
    `SELECT id
       FROM meetings
      WHERE id = $1
        AND citizen_id = $2
      LIMIT 1`,
    [meetingId, citizenId]
  );
  return result.rows[0] || null;
}

async function getCitizenComplaintById(complaintId, citizenId) {
  const result = await pool.query(
    `SELECT id
       FROM complaints
      WHERE id = $1
        AND citizen_id = $2
      LIMIT 1`,
    [complaintId, citizenId]
  );
  return result.rows[0] || null;
}

async function getAssignedMeetingForDeo(meetingId, deoId) {
  const result = await pool.query(
    `SELECT id, minister_id
       FROM meetings
      WHERE id = $1
        AND (assigned_deo_id = $2 OR status = 'completed')
      LIMIT 1`,
    [meetingId, deoId]
  );
  return result.rows[0] || null;
}

async function getDeoCalendarEventById(eventId, deoId) {
  const result = await pool.query(
    `SELECT id, minister_id
       FROM minister_calendar_events
      WHERE id = $1
        AND created_by_deo_id = $2
      LIMIT 1`,
    [eventId, deoId]
  );
  return result.rows[0] || null;
}

async function hasMinisterMeetingAccess(meetingId, ministerId) {
  const result = await pool.query(
    `SELECT 1
       FROM minister_calendar_events
      WHERE meeting_id = $1
        AND minister_id = $2
      LIMIT 1`,
    [meetingId, ministerId]
  );
  return Boolean(result.rows[0]);
}

async function hasMinisterEventAccess(eventId, ministerId) {
  const result = await pool.query(
    `SELECT 1
       FROM minister_calendar_events
      WHERE id = $1
        AND minister_id = $2
      LIMIT 1`,
    [eventId, ministerId]
  );
  return Boolean(result.rows[0]);
}

async function listFilesUploadedByActor(actorRole, actorId, filters = {}) {
  const values = [actorRole, actorId];
  const where = ['uploader_role = $1', 'uploaded_by = $2'];
  let index = 3;

  if (filters.contextType) {
    where.push(`context_type = $${index}`);
    values.push(filters.contextType);
    index += 1;
  }

  if (filters.contextId) {
    where.push(`context_id = $${index}`);
    values.push(filters.contextId);
    index += 1;
  }

  const result = await pool.query(
    `SELECT id, s3_key, uploaded_by, uploader_role, visible_to_role, original_name, mime_type,
            file_category, size, context_type, context_id, status, created_at
       FROM files
      WHERE ${where.join(' AND ')}
      ORDER BY created_at ASC`,
    values
  );

  return result.rows;
}

async function listFilesForContext(actorRole, filters = {}) {
  const values = [actorRole];
  const where = ['uploader_role = $1'];
  let index = 2;

  if (filters.contextType) {
    where.push(`context_type = $${index}`);
    values.push(filters.contextType);
    index += 1;
  }

  if (filters.contextId) {
    where.push(`context_id = $${index}`);
    values.push(filters.contextId);
    index += 1;
  }

  const result = await pool.query(
    `SELECT id, s3_key, uploaded_by, uploader_role, visible_to_role, original_name, mime_type,
            file_category, size, context_type, context_id, status, created_at
       FROM files
      WHERE ${where.join(' AND ')}
      ORDER BY created_at ASC`,
    values
  );

  return result.rows;
}

module.exports = {
  findUploadedFileById,
  findFileByS3Key,
  createFile,
  findFileRecordById,
  listFilesVisibleToRole,
  getCitizenMeetingById,
  getCitizenComplaintById,
  getAssignedMeetingForDeo,
  getDeoCalendarEventById,
  hasMinisterMeetingAccess,
  hasMinisterEventAccess,
  listFilesUploadedByActor,
  listFilesForContext,
};
