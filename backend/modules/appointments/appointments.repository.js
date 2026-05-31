const pool = require('../../config/database');
const { generateCaseCode } = require('../../utils/generateCaseCode');
const logger = require('../../utils/logger');

const appointmentSelect = `
  SELECT
    m.id,
    m.request_id,
    m.citizen_id,
    m.assigned_admin_id,
    m.assigned_deo_id,
    m.minister_id,
    m.linked_grievance_id,
    m.title,
    m.purpose,
    m.preferred_time,
    m.admin_referral,
    m.document_file_id,
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
    m.appointment_docket,
    m.completion_note,
    m.cancellation_reason,
    m.completed_at,
    m.created_at,
    m.updated_at,
    citizen.first_name,
    citizen.last_name,
    citizen.citizen_id AS citizen_code,
    citizen.mobile_number,
    citizen.city AS citizen_district,
    citizen.state AS citizen_state,
    citizen.local_mp AS citizen_local_mp,
    admin.first_name AS admin_first_name,
    admin.last_name AS admin_last_name,
    deo.first_name AS deo_first_name,
    deo.last_name AS deo_last_name,
    grievance.grievance_id AS linked_grievance_code,
    grievance.subject AS linked_grievance_subject
  FROM appointments m
  JOIN citizens citizen ON citizen.id = m.citizen_id
  LEFT JOIN admins admin ON admin.id = m.assigned_admin_id
  LEFT JOIN deos deo ON deo.id = m.assigned_deo_id
  LEFT JOIN grievances grievance ON grievance.id = m.linked_grievance_id
`;

function mapAppointment(row) {
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
    document_file_id: row.document_file_id,
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
    appointmentDocket: row.appointment_docket,
    completionNote: row.completion_note,
    cancellationReason: row.cancellation_reason,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    first_name: row.first_name,
    last_name: row.last_name,
    citizen_code: row.citizen_code,
    mobile_number: row.mobile_number,
    email: row.email,
    assignedAdminName: [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ') || '',
    assignedDeoName: [row.deo_first_name, row.deo_last_name].filter(Boolean).join(' ') || '',
    currentOwner: [row.deo_first_name, row.deo_last_name].filter(Boolean).join(' ')
      || [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ')
      || 'Appointment Pool',
    citizenSnapshot: {
      name: [row.first_name, row.last_name].filter(Boolean).join(' '),
      citizenId: row.citizen_code,
      phoneNumbers: row.mobile_number ? [row.mobile_number] : [],
      email: row.email || '',
      district: row.citizen_district || '',
      state: row.citizen_state || '',
      localMp: row.citizen_local_mp || '',
    },
    relatedGrievance: row.linked_grievance_id
      ? { id: row.linked_grievance_id, grievanceId: row.linked_grievance_code, title: row.linked_grievance_subject }
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

async function createAppointment({
  citizenId,
  title,
  purpose,
  preferredTime,
  adminReferral,
  assignedAdminId = null,
  documentFileId,
  additionalAttendees,
  linkedGrievanceId = null,
}) {
  const client = await pool.connect();
  try {
    logger.info('Creating appointment record', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      attendeeCount: Array.isArray(additionalAttendees) ? additionalAttendees.length : 0,
    });
    await client.query('BEGIN');
    const requestId = generateCaseCode('ARQ');
    const appointmentResult = await client.query(
      `INSERT INTO appointments
        (request_id, citizen_id, assigned_admin_id, title, purpose, preferred_time, admin_referral, document_file_id, linked_grievance_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [requestId, citizenId, assignedAdminId, title, purpose, preferredTime || null, adminReferral || null, documentFileId || null, linkedGrievanceId]
    );
    const appointment = appointmentResult.rows[0];

    if (documentFileId) {
      await client.query(
        `UPDATE uploaded_files
            SET entity_id = $2
          WHERE id = $1`,
        [documentFileId, appointment.id]
      );
    }

    for (const attendee of additionalAttendees) {
      await client.query(
        `INSERT INTO appointment_additional_attendees (appointment_id, attendee_name, attendee_phone)
         VALUES ($1,$2,$3)`,
        [appointment.id, attendee.attendeeName, attendee.attendeePhone]
      );
    }

    await client.query(
      `INSERT INTO appointment_status_history (appointment_id, new_status, actor_role, actor_id, note)
       VALUES ($1,'pending','citizen',$2,$3)`,
      [appointment.id, citizenId, 'Appointment request submitted']
    );

    await client.query('COMMIT');
    logger.info('Appointment record created', {
      appointmentId: appointment.id,
      requestId: appointment.request_id,
      citizenId,
    });
    return appointment;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Appointment creation failed', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getCitizenAppointments(citizenId, { limit, offset } = {}) {
  const params = [citizenId];
  // WHY: limit/offset are optional — if absent, all records returned (backward-compatible).
  let sql = `${appointmentSelect}
     WHERE m.citizen_id = $1
     ORDER BY m.updated_at DESC, m.created_at DESC`;
  if (limit != null) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (offset != null) {
    params.push(offset);
    sql += ` OFFSET $${params.length}`;
  }
  const result = await pool.query(sql, params);
  return result.rows.map(mapAppointment);
}

async function getAppointmentById(appointmentId) {
  const result = await pool.query(
    `${appointmentSelect}
     WHERE m.id = $1`,
    [appointmentId]
  );
  return result.rows[0] ? mapAppointment(result.rows[0]) : null;
}

async function getCitizenAppointmentById(appointmentId, citizenId) {
  const result = await pool.query(
    `${appointmentSelect}
     WHERE m.id = $1 AND m.citizen_id = $2`,
    [appointmentId, citizenId]
  );
  return result.rows[0] ? mapAppointment(result.rows[0]) : null;
}

async function getAppointmentQueue() {
  const result = await pool.query(
    `${appointmentSelect}
     WHERE m.status != 'rejected'
     ORDER BY m.updated_at DESC, m.created_at DESC`
  );
  return result.rows.map(mapAppointment);
}

const ALLOWED_PATCH_COLUMNS = new Set([
  'assigned_admin_id', 'assigned_deo_id', 'minister_id', 'rejection_reason',
  'verification_reason', 'verification_notes', 'scheduled_at', 'scheduled_end_at',
  'scheduled_location', 'is_vip', 'admin_comments', 'visitor_id', 'appointment_docket',
  'cancellation_reason', 'cancelled_at', 'completion_note', 'completed_at', 'document_file_id',
]);

async function updateAppointmentStatus({ appointmentId, status, previousStatus, actorRole, actorId, note, patch = {}, calendarEvent = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sets = ['status = $2', 'updated_at = NOW()'];
    const values = [appointmentId, status];
    let index = 3;

    for (const [column, value] of Object.entries(patch)) {
      if (!ALLOWED_PATCH_COLUMNS.has(column)) {
        throw new Error(`Disallowed patch column: ${column}`);
      }
      sets.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }

    await client.query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = $1`, values);
    await client.query(
      `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, actor_role, actor_id, note)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [appointmentId, previousStatus, status, actorRole, actorId || null, note || null]
    );

    if (calendarEvent) {
      if (calendarEvent.action === 'upsert') {
        const existing = await client.query(
          `SELECT id FROM minister_calendar_events WHERE appointment_id = $1`,
          [appointmentId]
        );
        if (existing.rows[0]) {
          await client.query(
            `UPDATE minister_calendar_events
             SET minister_id = $2, title = $3, starts_at = $4, ends_at = $5,
                 location = $6, is_vip = $7, comments = $8
             WHERE appointment_id = $1`,
            [appointmentId, calendarEvent.ministerId, calendarEvent.title,
             calendarEvent.startsAt, calendarEvent.endsAt, calendarEvent.location,
             calendarEvent.isVip, calendarEvent.comments || null]
          );
        } else {
          await client.query(
            `INSERT INTO minister_calendar_events
              (minister_id, appointment_id, title, starts_at, ends_at, location, is_vip, comments, created_by_admin_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [calendarEvent.ministerId, appointmentId, calendarEvent.title,
             calendarEvent.startsAt, calendarEvent.endsAt, calendarEvent.location,
             calendarEvent.isVip, calendarEvent.comments || null, calendarEvent.createdByAdminId]
          );
        }
      } else if (calendarEvent.action === 'delete') {
        await client.query(
          `DELETE FROM minister_calendar_events WHERE appointment_id = $1`,
          [appointmentId]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createCalendarEvent({ ministerId, appointmentId, title, startsAt, endsAt, location, isVip, comments, createdByAdminId }) {
  const result = await pool.query(
    `INSERT INTO minister_calendar_events
      (minister_id, appointment_id, title, starts_at, ends_at, location, is_vip, comments, created_by_admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [ministerId, appointmentId, title, startsAt, endsAt, location, isVip, comments || null, createdByAdminId]
  );
  return result.rows[0];
}

async function updateCalendarEventByAppointmentId(appointmentId, payload) {
  const result = await pool.query(
    `UPDATE minister_calendar_events
     SET minister_id = $2,
         title = $3,
         starts_at = $4,
         ends_at = $5,
         location = $6,
         is_vip = $7,
         comments = $8
     WHERE appointment_id = $1
     RETURNING *`,
    [
      appointmentId,
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

async function getAppointmentHistory(appointmentId) {
  const result = await pool.query(
    `SELECT id, previous_status, new_status, actor_role, note, created_at
     FROM appointment_status_history
     WHERE appointment_id = $1
     ORDER BY created_at ASC`,
    [appointmentId]
  );
  return result.rows;
}

async function listAppointmentFilesForMinister(appointmentId, ministerId) {
  const result = await pool.query(
    `SELECT file_id AS id, entity_type, original_name, mime_type, file_size, created_at, storage_path, source_kind
       FROM (
         SELECT uf.id AS file_id, uf.entity_type, uf.original_name, uf.mime_type, uf.file_size, uf.created_at, uf.storage_path, 'legacy' AS source_kind
           FROM minister_calendar_events mce
           JOIN appointments m ON m.id = mce.appointment_id
           JOIN uploaded_files uf
             ON (
                  (uf.id = m.document_file_id)
                  OR
                  (uf.entity_id = m.id AND uf.entity_type = 'appointment_photo')
                )
          WHERE mce.appointment_id = $1
            AND mce.minister_id = $2
         UNION ALL
         SELECT f.id AS file_id, f.file_category AS entity_type, f.original_name, f.mime_type, f.size AS file_size, f.created_at, f.s3_key AS storage_path, 'managed' AS source_kind
           FROM minister_calendar_events mce
           JOIN files f ON f.context_type = 'appointment' AND f.context_id = mce.appointment_id
          WHERE mce.appointment_id = $1
            AND mce.minister_id = $2
            AND f.visible_to_role = 'minister'
       ) combined
      ORDER BY created_at ASC`,
    [appointmentId, ministerId]
  );
  return result.rows;
}

// Citizen appointment files are visible to ALL admins while the appointment sits in the
// pending pool (unassigned). Once an admin claims it, only that admin can see them.
// DEO-uploaded appointment photos remain visible only to the assigned admin.
async function listAppointmentFilesForAdmin(appointmentId, adminId) {
  const result = await pool.query(
    `SELECT file_id AS id, entity_type, original_name, mime_type, file_size, created_at, storage_path, source_kind
       FROM (
         SELECT uf.id AS file_id, uf.entity_type, uf.original_name, uf.mime_type, uf.file_size, uf.created_at, uf.storage_path, 'legacy' AS source_kind
           FROM appointments m
           JOIN uploaded_files uf ON uf.id = m.document_file_id
          WHERE m.id = $1
            AND (m.assigned_admin_id = $2 OR (m.assigned_admin_id IS NULL AND m.status = 'pending'))
         UNION ALL
         SELECT uf.id AS file_id, uf.entity_type, uf.original_name, uf.mime_type, uf.file_size, uf.created_at, uf.storage_path, 'legacy' AS source_kind
           FROM appointments m
           JOIN uploaded_files uf ON uf.entity_id = m.id AND uf.entity_type = 'appointment_photo'
          WHERE m.id = $1
            AND m.assigned_admin_id = $2
         UNION ALL
         SELECT f.id AS file_id, f.file_category AS entity_type, f.original_name, f.mime_type, f.size AS file_size, f.created_at, f.s3_key AS storage_path, 'managed' AS source_kind
           FROM appointments m
           JOIN files f ON f.context_type = 'appointment' AND f.context_id = m.id
          WHERE m.id = $1
            AND f.uploader_role = 'citizen'
            AND (m.assigned_admin_id = $2 OR (m.assigned_admin_id IS NULL AND m.status = 'pending'))
       ) combined
      ORDER BY created_at ASC`,
    [appointmentId, adminId]
  );
  return result.rows;
}

async function atomicClaimAppointment(appointmentId, adminId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE appointments
       SET assigned_admin_id = $2, status = 'accepted', updated_at = NOW()
       WHERE id = $1
         AND status = 'pending'
         AND (assigned_admin_id IS NULL OR assigned_admin_id = $2)
       RETURNING id, citizen_id, status`,
      [appointmentId, adminId]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, actor_role, actor_id, note)
       VALUES ($1, 'pending', 'accepted', 'admin', $2, 'Appointment assigned to admin')`,
      [appointmentId, adminId]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function linkUploadedFilesToEntity(fileIds, entityId) {
  if (!fileIds.length) return;
  const placeholders = fileIds.map((_, i) => `$${i + 2}`).join(', ');
  await pool.query(
    `UPDATE uploaded_files SET entity_id = $1 WHERE id IN (${placeholders})`,
    [entityId, ...fileIds]
  );
}

async function listUploadedFilesByEntityId(entityId, entityTypes) {
  if (!entityTypes.length) return [];
  const placeholders = entityTypes.map((_, i) => `$${i + 2}`).join(', ');
  const result = await pool.query(
    `SELECT id, entity_type, entity_id, original_name, mime_type, file_size, storage_path, created_at
       FROM uploaded_files
      WHERE entity_id = $1
        AND entity_type IN (${placeholders})
      ORDER BY created_at ASC`,
    [entityId, ...entityTypes]
  );
  return result.rows;
}

module.exports = {
  createUploadedFile,
  linkUploadedFilesToEntity,
  listUploadedFilesByEntityId,
  createAppointment,
  getCitizenAppointments,
  getAppointmentById,
  getCitizenAppointmentById,
  getAppointmentQueue,
  updateAppointmentStatus,
  createCalendarEvent,
  updateCalendarEventByAppointmentId,
  getAppointmentHistory,
  listAppointmentFilesForMinister,
  listAppointmentFilesForAdmin,
  atomicClaimAppointment,
};
