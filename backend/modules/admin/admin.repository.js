const pool = require('../../config/database');

async function createAdmin(payload) {
  const result = await pool.query(
    `INSERT INTO admins
      (username, first_name, middle_name, last_name, age, sex, designation, email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag, phone_number, password_hash)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id, username, first_name, email, designation, phone_number, status`,
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
    ]
  );
  return result.rows[0];
}

async function getDashboard() {
  const [meetingQueue, complaintQueue, escalated, scheduled] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM meetings WHERE status IN ('pending', 'accepted', 'verification_pending', 'verified')`),
    pool.query(`SELECT COUNT(*) FROM complaints WHERE status IN ('submitted', 'in_review')`),
    pool.query(`SELECT COUNT(*) FROM complaints WHERE status = 'escalated'`),
    pool.query(`SELECT COUNT(*) FROM meetings WHERE status = 'scheduled'`),
  ]);

  return {
    pendingMeetings: Number(meetingQueue.rows[0].count),
    pendingComplaints: Number(complaintQueue.rows[0].count),
    escalatedComplaints: Number(escalated.rows[0].count),
    scheduledMeetings: Number(scheduled.rows[0].count),
  };
}

module.exports = { createAdmin, getDashboard };
