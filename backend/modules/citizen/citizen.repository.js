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

async function findCitizenById(id) {
  const result = await pool.query(
    `SELECT id, citizen_id, first_name, middle_name, last_name, email, age, sex, mobile_number, pincode, city, state, local_mp, photo_path, status, is_verified, created_at
     FROM citizens WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { createCitizen, findCitizenById };
