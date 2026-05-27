const pool = require('../../config/database');
const { generateCaseCode } = require('../../utils/generateCaseCode');
const logger = require('../../utils/logger');

const grievanceSelect = `
  SELECT
    c.id,
    c.grievance_id,
    c.citizen_id,
    c.assigned_admin_id,
    c.subject,
    c.description,
    c.state,
    c.district,
    c.incident_date,
    c.document_file_id,
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
    c.related_appointment_id,
    c.deo_office,
    c.deo_letterhead_generated_at,
    c.letterhead_deo_id,
    c.letterhead_file_id,
    c.created_at,
    c.updated_at,
    c.citizen_name,
    c.citizen_phone,
    citizen.first_name AS citizen_first_name,
    citizen.last_name AS citizen_last_name,
    citizen.citizen_id AS citizen_code,
    citizen.mobile_number,
    citizen.city AS citizen_district,
    citizen.state AS citizen_state,
    citizen.local_mp AS citizen_local_mp,
    admin.first_name AS admin_first_name,
    admin.last_name AS admin_last_name,
    appointment.request_id AS related_appointment_request_id,
    appointment.title AS related_appointment_title,
    (SELECT gsh.actor_role FROM grievance_status_history gsh
       WHERE gsh.grievance_id = c.id
       ORDER BY gsh.created_at ASC, gsh.id ASC
       LIMIT 1) AS initial_actor_role
  FROM grievances c
  LEFT JOIN citizens citizen ON citizen.id = c.citizen_id
  LEFT JOIN admins admin ON admin.id = c.assigned_admin_id
  LEFT JOIN appointments appointment ON appointment.id = c.related_appointment_id
`;

function mapGrievance(row) {
  return {
    id: row.id,
    _id: row.id,
    citizen_id: row.citizen_id,
    grievanceId: row.grievance_id,
    title: row.subject,
    subject: row.subject,
    description: row.description,
    details: row.description,
    state: row.state,
    district: row.district,
    incidentDate: row.incident_date,
    document_file_id: row.document_file_id,
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
    updatedAt: row.updated_at,
    citizenSnapshot: {
      name: [row.citizen_first_name, row.citizen_last_name].filter(Boolean).join(' ') || row.citizen_name || '',
      citizenId: row.citizen_code || null,
      phoneNumbers: row.mobile_number
        ? [row.mobile_number]
        : row.citizen_phone ? [row.citizen_phone] : [],
      email: row.email || '',
      district: row.citizen_district || '',
      state: row.citizen_state || '',
      localMp: row.citizen_local_mp || '',
    },
    assignedAdminUserId: row.assigned_admin_id,
    assignedAdminName: [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ') || '',
    currentOwner: [row.admin_first_name, row.admin_last_name].filter(Boolean).join(' ') || 'Admin Pool',
    relatedAppointment: row.related_appointment_id
      ? { id: row.related_appointment_id, requestId: row.related_appointment_request_id, title: row.related_appointment_title }
      : null,
    deoOffice: row.deo_office || null,
    deoLetterheadGeneratedAt: row.deo_letterhead_generated_at || null,
    letterheadFileId: row.letterhead_file_id || null,
    letterheadReady: Boolean(row.deo_letterhead_generated_at),
    createdByDeo: row.initial_actor_role === 'deo',
  };
}

async function createGrievance({
  citizenId = null,
  citizenName = null,
  citizenPhone = null,
  subject,
  description,
  state,
  district,
  incidentDate,
  documentFileId,
  actorRole = 'citizen',
  actorId,
}) {
  const client = await pool.connect();
  try {
    logger.info('Creating grievance record', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      incidentDate: incidentDate || null,
    });
    await client.query('BEGIN');
    const grievanceId = generateCaseCode('GRQ');
    const result = await client.query(
      `INSERT INTO grievances
        (grievance_id, citizen_id, citizen_name, citizen_phone, subject, description, state, district, incident_date, document_file_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, grievance_id, citizen_id, subject, description, state, district, incident_date, status, created_at, updated_at`,
      [grievanceId, citizenId || null, citizenName || null, citizenPhone || null, subject, description, state, district, incidentDate || null, documentFileId || null]
    );
    const grievance = result.rows[0];

    if (documentFileId) {
      await client.query(
        `UPDATE uploaded_files
            SET entity_id = $2
          WHERE id = $1`,
        [documentFileId, grievance.id]
      );
    }

    await client.query(
      `INSERT INTO grievance_status_history (grievance_id, new_status, actor_role, actor_id, note)
       VALUES ($1,'submitted',$2,$3,'Grievance submitted')`,
      [grievance.id, actorRole, actorId || null]
    );
    await client.query('COMMIT');
    logger.info('Grievance record created', {
      grievanceDbId: grievance.id,
      grievanceId: grievance.grievance_id,
      citizenId,
    });
    return grievance;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Grievance creation failed', {
      citizenId,
      hasDocument: Boolean(documentFileId),
      error,
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getCitizenGrievances(citizenId) {
  const result = await pool.query(
    `${grievanceSelect}
     WHERE c.citizen_id = $1
     ORDER BY c.updated_at DESC, c.created_at DESC`,
    [citizenId]
  );
  return result.rows.map(mapGrievance);
}

async function getCitizenGrievanceById(id, citizenId) {
  const result = await pool.query(
    `${grievanceSelect}
     WHERE c.id = $1 AND c.citizen_id = $2`,
    [id, citizenId]
  );
  return result.rows[0] ? mapGrievance(result.rows[0]) : null;
}

async function getGrievanceQueue() {
  const result = await pool.query(
    `${grievanceSelect}
     WHERE c.status NOT IN ('rejected')
     ORDER BY c.updated_at DESC, c.created_at DESC`
  );
  return result.rows.map(mapGrievance);
}

async function getGrievanceById(id) {
  const result = await pool.query(
    `${grievanceSelect}
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] ? mapGrievance(result.rows[0]) : null;
}

async function getGrievanceHistory(grievanceId) {
  const result = await pool.query(
    `SELECT id, previous_status, new_status, actor_role, note, created_at
     FROM grievance_status_history
     WHERE grievance_id = $1
     ORDER BY created_at ASC`,
    [grievanceId]
  );
  return result.rows;
}

const ALLOWED_PATCH_COLUMNS = new Set([
  'assigned_admin_id', 'status_reason', 'department', 'officer_name', 'officer_contact', 'manual_contact',
  'call_scheduled_at', 'call_outcome', 'resolution_summary', 'resolution_note',
  'resolution_document_names', 'reopened_count', 'closed_at',
  'deo_office', 'deo_letterhead_generated_at', 'letterhead_deo_id', 'letterhead_file_id',
]);

async function updateGrievanceStatus({
  grievanceId,
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
    const values = [grievanceId, status];
    const sets = ['status = $2', 'updated_at = NOW()'];
    let index = 3;

    for (const [column, value] of Object.entries(patch)) {
      if (!ALLOWED_PATCH_COLUMNS.has(column)) {
        throw new Error(`Disallowed patch column: ${column}`);
      }
      sets.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }

    await client.query(`UPDATE grievances SET ${sets.join(', ')} WHERE id = $1`, values);
    await client.query(
      `INSERT INTO grievance_status_history (grievance_id, previous_status, new_status, actor_role, actor_id, note)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [grievanceId, previousStatus, status, actorRole, actorId || null, note || null]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// All grievances for the CM admin view (no filter by assigned admin)
async function getAllGrievancesForCmAdmin() {
  const result = await pool.query(
    `${grievanceSelect}
     ORDER BY c.updated_at DESC, c.created_at DESC`
  );
  return result.rows.map(mapGrievance);
}

// Grievances pending DEO letterhead (excludes those already processed by DEO)
async function getSubmittedGrievancesForDeo() {
  const result = await pool.query(
    `${grievanceSelect}
     WHERE c.status NOT IN ('rejected', 'completed')
       AND c.deo_letterhead_generated_at IS NULL
     ORDER BY c.created_at DESC`
  );
  return result.rows.map(mapGrievance);
}

async function updateGrievanceLetterhead({ grievanceId, deoId, office, fileId }) {
  const result = await pool.query(
    `UPDATE grievances
        SET deo_office = $2,
            deo_letterhead_generated_at = NOW(),
            letterhead_deo_id = $3,
            letterhead_file_id = $4,
            updated_at = NOW()
      WHERE id = $1
      RETURNING id`,
    [grievanceId, office, deoId, fileId || null]
  );
  return result.rows[0] || null;
}

module.exports = {
  createGrievance,
  getCitizenGrievances,
  getCitizenGrievanceById,
  getAllGrievancesForCmAdmin,
  getGrievanceQueue,
  getGrievanceById,
  getGrievanceHistory,
  getSubmittedGrievancesForDeo,
  updateGrievanceLetterhead,
  updateGrievanceStatus,
};
