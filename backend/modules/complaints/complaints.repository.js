const pool = require('../../config/database');

async function createComplaint({ citizenId, subject, description, documentFileId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO complaints (citizen_id, subject, description, document_file_id)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [citizenId, subject, description, documentFileId || null]
    );
    const complaint = result.rows[0];

    await client.query(
      `INSERT INTO complaint_status_history (complaint_id, new_status, actor_role, actor_id, note)
       VALUES ($1,'submitted','citizen',$2,'Complaint submitted')`,
      [complaint.id, citizenId]
    );
    await client.query('COMMIT');
    return complaint;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getCitizenComplaints(citizenId) {
  const result = await pool.query(
    `SELECT id, subject, status, resolution_note, created_at, updated_at
     FROM complaints WHERE citizen_id = $1 ORDER BY created_at DESC`,
    [citizenId]
  );
  return result.rows;
}

async function getCitizenComplaintById(id, citizenId) {
  const result = await pool.query(
    `SELECT id, citizen_id, subject, description, status, resolution_note, created_at, updated_at
     FROM complaints WHERE id = $1 AND citizen_id = $2`,
    [id, citizenId]
  );
  return result.rows[0] || null;
}

async function getComplaintQueue() {
  const result = await pool.query(
    `SELECT c.id, c.subject, c.status, c.created_at, z.first_name, z.last_name, z.citizen_id
     FROM complaints c
     JOIN citizens z ON z.id = c.citizen_id
     WHERE c.status IN ('submitted', 'in_review', 'escalated')
     ORDER BY c.created_at ASC`
  );
  return result.rows;
}

async function getComplaintById(id) {
  const result = await pool.query('SELECT * FROM complaints WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getComplaintHistory(complaintId) {
  const result = await pool.query(
    `SELECT previous_status, new_status, actor_role, note, created_at
     FROM complaint_status_history
     WHERE complaint_id = $1
     ORDER BY created_at ASC`,
    [complaintId]
  );
  return result.rows;
}

async function updateComplaintStatus({ complaintId, status, previousStatus, actorRole, actorId, note }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE complaints
       SET status = $2, resolution_note = $3, updated_at = NOW()
       WHERE id = $1`,
      [complaintId, status, note]
    );
    await client.query(
      `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, actor_role, actor_id, note)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [complaintId, previousStatus, status, actorRole, actorId || null, note]
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
