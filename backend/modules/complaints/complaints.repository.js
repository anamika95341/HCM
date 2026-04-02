const pool = require('../../config/database');
const { generateCaseCode } = require('../../utils/generateCaseCode');
const logger = require('../../utils/logger');

const complaintSelect = `
  SELECT
    c.id,
    c.complaint_id,
    c.citizen_id,
    c.assigned_admin_id,
    c.subject,
    c.description,
    c.complaint_location,
    c.complaint_type,
    c.department,
    c.officer_name,
    c.officer_contact,
    c.manual_contact,
    c.call_scheduled_at,
    c.call_outcome,
    c.status,
    c.status_reason,
    c.resolution_note,
    c.resolution_summary,
    c.resolution_document_names,
    c.reopened_count,
    c.related_meeting_id,
    c.created_at,
    c.updated_at,
    citizen.first_name AS citizen_first_name,
    citizen.last_name AS citizen_last_name,
    citizen.citizen_id AS citizen_code,
    citizen.mobile_number,
    citizen.email,
    admin.first_name AS admin_first_name,
    admin.last_name AS admin_last_name,
    meeting.request_id AS related_meeting_request_id,
    meeting.title AS related_meeting_title
  FROM complaints c
  JOIN citizens citizen ON citizen.id = c.citizen_id
  LEFT JOIN admins admin ON admin.id = c.assigned_admin_id
  LEFT JOIN meetings meeting ON meeting.id = c.related_meeting_id
`;

function mapComplaint(row) {
  return {
    id: row.id,
    _id: row.id,
    citizen_id: row.citizen_id,
    complaintId: row.complaint_id,
    title: row.subject,
    subject: row.subject,
    description: row.description,
    details: row.description,
    complaintLocation: row.complaint_location,
    complaintType: row.complaint_type,
    department: row.department,
    officerName: row.officer_name,
    officerContact: row.officer_contact,
    manualContact: row.manual_contact,
    callScheduledAt: row.call_scheduled_at,
    callOutcome: row.call_outcome,
    status: row.status,
    statusLabel: String(row.status || '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    statusReason: row.status_reason || row.resolution_note || '',
    resolutionNote: row.resolution_note,
    resolutionSummary: row.resolution_summary,
    resolutionDocs: Array.isArray(row.resolution_document_names)
      ? row.resolution_document_names.map((name) => ({ name }))
      : [],
    reopenedCount: row.reopened_count || 0,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    citizenSnapshot: {
      name: [row.citizen_first_name, row.citizen_last_name].filter(Boolean).join(' '),
      citizenId: row.citizen_code,
      phoneNumbers: row.mobile_number ? [row.mobile_number] : [],
      email: row.email || '',
    },
    assignedAdminUserId: row.assigned_admin_id,
    assignedAdminName: [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ') || '',
    currentOwner: [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ') || 'Admin Pool',
    relatedMeeting: row.related_meeting_id
      ? { id: row.related_meeting_id, requestId: row.related_meeting_request_id, title: row.related_meeting_title }
      : null,
  };
}

async function createComplaint({
  citizenId,
  subject,
  description,
  complaintLocation,
  complaintType,
  documentFileId,
}) {
  const client = await pool.connect();
  try {
    logger.info('Creating complaint record', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      complaintType: complaintType || null,
    });
    await client.query('BEGIN');
    const complaintId = generateCaseCode('COMP');
    const result = await client.query(
      `INSERT INTO complaints
        (complaint_id, citizen_id, subject, description, complaint_location, complaint_type, document_file_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, complaint_id, citizen_id, subject, description, complaint_location, complaint_type, status, created_at, updated_at`,
      [complaintId, citizenId, subject, description, complaintLocation || null, complaintType || null, documentFileId || null]
    );
    const complaint = result.rows[0];

    await client.query(
      `INSERT INTO complaint_status_history (complaint_id, new_status, actor_role, actor_id, note)
       VALUES ($1,'submitted','citizen',$2,'Complaint submitted')`,
      [complaint.id, citizenId]
    );
    await client.query('COMMIT');
    logger.info('Complaint record created', {
      complaintDbId: complaint.id,
      complaintId: complaint.complaint_id,
      citizenId,
    });
    return complaint;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Complaint creation failed', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getCitizenComplaints(citizenId) {
  const result = await pool.query(
    `${complaintSelect}
     WHERE c.citizen_id = $1
     ORDER BY c.updated_at DESC, c.created_at DESC`,
    [citizenId]
  );
  return result.rows.map(mapComplaint);
}

async function getCitizenComplaintById(id, citizenId) {
  const result = await pool.query(
    `${complaintSelect}
     WHERE c.id = $1 AND c.citizen_id = $2`,
    [id, citizenId]
  );
  return result.rows[0] ? mapComplaint(result.rows[0]) : null;
}

async function getComplaintQueue() {
  const result = await pool.query(
    `${complaintSelect}
     WHERE c.status != 'completed'
     ORDER BY c.updated_at DESC, c.created_at DESC`
  );
  return result.rows.map(mapComplaint);
}

async function getComplaintById(id) {
  const result = await pool.query(
    `${complaintSelect}
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] ? mapComplaint(result.rows[0]) : null;
}

async function getComplaintHistory(complaintId) {
  const result = await pool.query(
    `SELECT id, previous_status, new_status, actor_role, note, created_at
     FROM complaint_status_history
     WHERE complaint_id = $1
     ORDER BY created_at ASC`,
    [complaintId]
  );
  return result.rows;
}

async function updateComplaintStatus({
  complaintId,
  status,
  previousStatus,
  actorRole,
  actorId,
  note,
  patch = {},
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const values = [complaintId, status];
    const sets = ['status = $2', 'updated_at = NOW()'];
    let index = 3;

    for (const [column, value] of Object.entries(patch)) {
      sets.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }

    await client.query(`UPDATE complaints SET ${sets.join(', ')} WHERE id = $1`, values);
    await client.query(
      `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, actor_role, actor_id, note)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [complaintId, previousStatus, status, actorRole, actorId || null, note || null]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createComplaint,
  getCitizenComplaints,
  getCitizenComplaintById,
  getComplaintQueue,
  getComplaintById,
  getComplaintHistory,
  updateComplaintStatus,
};
