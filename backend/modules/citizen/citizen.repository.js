const pool = require('../../config/database');

async function createCitizen(payload) {
  const result = await pool.query(
    `INSERT INTO citizens
      (first_name, middle_name, last_name, email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag, age, sex, mobile_number, pincode, city, state, local_mp, photo_path, password_hash, preferred_verification_channel)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING id, first_name, middle_name, last_name, email, mobile_number, preferred_verification_channel, status`,
    [
      payload.firstName,
      payload.middleName || null,
      payload.lastName || null,
      payload.email || null,
      payload.aadhaarHash,
      payload.aadhaar.ciphertext,
      payload.aadhaar.iv,
      payload.aadhaar.tag,
      payload.age,
      payload.sex,
      payload.mobileNumber,
      payload.pincode,
      payload.city,
      payload.state,
      payload.localMp,
      payload.photoPath || null,
      payload.passwordHash,
      payload.preferredVerificationChannel,
    ]
  );
  return result.rows[0];
}

async function findCitizenByRegistrationConflict({ email, aadhaarHash, mobileNumber }) {
  const result = await pool.query(
    `SELECT id, citizen_id, email, aadhaar_hash, mobile_number, is_verified, status
     FROM citizens
     WHERE deleted_at IS NULL
       AND (email = $1 OR aadhaar_hash = $2 OR mobile_number = $3)
     ORDER BY created_at DESC
     LIMIT 1`,
    [email || null, aadhaarHash, mobileNumber]
  );
  return result.rows[0] || null;
}

async function updatePendingCitizen(id, payload) {
  const result = await pool.query(
    `UPDATE citizens
     SET first_name = $2,
         middle_name = $3,
         last_name = $4,
         email = $5,
         aadhaar_hash = $6,
         aadhaar_ciphertext = $7,
         aadhaar_iv = $8,
         aadhaar_tag = $9,
         age = $10,
         sex = $11,
         mobile_number = $12,
         pincode = $13,
         city = $14,
         state = $15,
         local_mp = $16,
         photo_path = $17,
         password_hash = $18,
         preferred_verification_channel = $19,
         status = 'pending_verification',
         updated_at = NOW()
     WHERE id = $1 AND is_verified = FALSE AND deleted_at IS NULL
     RETURNING id, first_name, middle_name, last_name, email, mobile_number, preferred_verification_channel, status`,
    [
      id,
      payload.firstName,
      payload.middleName || null,
      payload.lastName || null,
      payload.email || null,
      payload.aadhaarHash,
      payload.aadhaar.ciphertext,
      payload.aadhaar.iv,
      payload.aadhaar.tag,
      payload.age,
      payload.sex,
      payload.mobileNumber,
      payload.pincode,
      payload.city,
      payload.state,
      payload.localMp,
      payload.photoPath || null,
      payload.passwordHash,
      payload.preferredVerificationChannel,
    ]
  );
  return result.rows[0] || null;
}

async function findCitizenById(id) {
  const result = await pool.query(
    `SELECT id, citizen_id, first_name, middle_name, last_name, email, age, sex, mobile_number, pincode, city, state, local_mp, photo_path, status, is_verified, created_at
     FROM citizens WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { createCitizen, findCitizenByRegistrationConflict, updatePendingCitizen, findCitizenById };
