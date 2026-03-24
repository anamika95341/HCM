const pool = require('../../config/database');

async function createAdmin(payload, db = pool) {
  const result = await db.query(
    `INSERT INTO admins
      (username, first_name, middle_name, last_name, age, sex, designation, email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag, phone_number, password_hash, status, is_verified, created_by_master_admin_id)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id, username, first_name, email, designation, phone_number, status, is_verified`,
    [
      payload.username,
      payload.firstName,
      payload.middleName || null,
      payload.lastName || null,
      payload.age,
      payload.sex,
      payload.designation,
      payload.email,
      payload.aadhaarHash,
      payload.aadhaar.ciphertext,
      payload.aadhaar.iv,
      payload.aadhaar.tag,
      payload.phoneNumber,
      payload.passwordHash,
      payload.status || 'active',
      payload.isVerified ?? true,
      payload.createdByMasterAdminId || null,
    ]
  );
  return result.rows[0];
}

async function getDashboard() {
  const [meetingQueue, complaintQueue, escalated, scheduled] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM meetings WHERE status IN ('pending', 'accepted', 'verification_pending', 'verified', 'not_verified', 'scheduled')`),
    pool.query(`SELECT COUNT(*) FROM complaints WHERE status IN ('submitted', 'assigned', 'in_review', 'department_contact_identified', 'call_scheduled', 'followup_in_progress')`),
    pool.query(`SELECT COUNT(*) FROM complaints WHERE status = 'escalated_to_meeting'`),
    pool.query(`SELECT COUNT(*) FROM meetings WHERE status = 'scheduled'`),
  ]);

  return {
    pendingMeetings: Number(meetingQueue.rows[0].count),
    pendingComplaints: Number(complaintQueue.rows[0].count),
    escalatedComplaints: Number(escalated.rows[0].count),
    scheduledMeetings: Number(scheduled.rows[0].count),
  };
}

async function listActiveAdminsForCitizenDirectory() {
  const result = await pool.query(
    `SELECT id, first_name, last_name, designation
     FROM admins
     WHERE status = 'active'
     ORDER BY first_name ASC, last_name ASC`
  );
  return result.rows;
}

async function listWorkflowDirectory() {
  const [deos, ministers] = await Promise.all([
    pool.query(
      `SELECT id, first_name, last_name, designation
       FROM deos
       WHERE status = 'active' AND is_verified = TRUE
       ORDER BY first_name ASC, last_name ASC`
    ),
    pool.query(
      `SELECT id, first_name, last_name
       FROM ministers
       WHERE status = 'active'
       ORDER BY first_name ASC, last_name ASC`
    ),
  ]);

  return {
    deos: deos.rows,
    ministers: ministers.rows,
  };
}

function createDeoUsername({ firstName, lastName, email }) {
  const base = (email || `${firstName}.${lastName || 'deo'}`)
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 70) || 'deo.user';
  return `deo.${base}`;
}

async function findDeoByIdentityConflict({ email, phoneNumber, aadhaarHash }, db = pool) {
  const result = await db.query(
    `SELECT id, username, email, phone_number, aadhaar_hash
     FROM deos
     WHERE email = $1 OR phone_number = $2 OR aadhaar_hash = $3`,
    [email, phoneNumber, aadhaarHash]
  );
  return result.rows[0] || null;
}

async function createDeo(payload, db = pool) {
  const baseUsername = createDeoUsername(payload);

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? baseUsername : `${baseUsername}.${suffix}`;
    try {
      const result = await db.query(
        `INSERT INTO deos
          (username, first_name, middle_name, last_name, age, sex, email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag, phone_number, designation, password_hash, status, created_by_admin_id, created_by_master_admin_id, is_verified)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending_verification',$15,$16,FALSE)
         RETURNING id, username, first_name, middle_name, last_name, age, sex, email, phone_number, designation, status, is_verified, created_by_admin_id, created_by_master_admin_id, created_at`,
        [
          candidate,
          payload.firstName,
          payload.middleName || null,
          payload.lastName || null,
          payload.age,
          payload.sex,
          payload.email,
          payload.aadhaarHash,
          payload.aadhaar.ciphertext,
          payload.aadhaar.iv,
          payload.aadhaar.tag,
          payload.phoneNumber,
          payload.designation,
          payload.passwordHash,
          payload.createdByAdminId || null,
          payload.createdByMasterAdminId || null,
        ]
      );
      return result.rows[0];
    } catch (error) {
      if (error?.code === '23505' && String(error?.constraint || '').includes('username')) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Unable to allocate a DEO username');
}

async function listDeosWithCreators() {
  const result = await pool.query(
    `SELECT d.id, d.username, d.first_name, d.middle_name, d.last_name, d.age, d.sex, d.email, d.phone_number, d.designation,
            d.status, d.is_verified, d.created_at, d.created_by_admin_id, d.created_by_master_admin_id,
            a.first_name AS creator_first_name, a.last_name AS creator_last_name, a.username AS creator_username,
            m.first_name AS creator_master_first_name, m.last_name AS creator_master_last_name, m.username AS creator_master_username
       FROM deos d
       LEFT JOIN admins a ON a.id = d.created_by_admin_id
       LEFT JOIN master_admins m ON m.id = d.created_by_master_admin_id
      ORDER BY d.created_at DESC`
  );
  return result.rows;
}

async function deleteDeoById(deoId, masterAdminId = null) {
  if (masterAdminId) {
    await pool.query(
      `UPDATE deos
          SET status = 'disabled',
              removed_at = NOW(),
              removed_by_master_admin_id = $2,
              updated_at = NOW()
        WHERE id = $1 AND is_verified = FALSE`,
      [deoId, masterAdminId]
    );
    return;
  }
  await pool.query('DELETE FROM deos WHERE id = $1 AND is_verified = FALSE', [deoId]);
}

module.exports = {
  createAdmin,
  createDeo,
  deleteDeoById,
  findDeoByIdentityConflict,
  getDashboard,
  listActiveAdminsForCitizenDirectory,
  listWorkflowDirectory,
  listDeosWithCreators,
};
