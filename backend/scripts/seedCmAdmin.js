/**
 * Seed script to create the Chief Minister admin account (Mahendra Pratap Singh).
 * Run once: node Backend/scripts/seedCmAdmin.js
 *
 * Credentials:
 *   Username : mahendra.pratap.singh
 *   Password : CM@Admin2024!
 *   Email    : mps@hcm.gov.in
 */

'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { encryptAadhaar, sha256 } = require('../utils/crypto');

// Deterministic dummy aadhaar for the fixed system account
const DUMMY_AADHAAR = '000000000001';

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT id FROM admins WHERE username = $1`,
      ['mahendra.pratap.singh']
    );

    if (existing.rows.length > 0) {
      console.log('CM admin already exists. Skipping seed.');
      return;
    }

    const passwordHash = await bcrypt.hash('CM@Admin2024!', 12);
    const aadhaarHash = sha256(DUMMY_AADHAAR);
    const aadhaar = encryptAadhaar(DUMMY_AADHAAR);

    const result = await client.query(
      `INSERT INTO admins
        (username, first_name, middle_name, last_name, age, sex, designation,
         email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag,
         phone_number, password_hash, status, is_verified, admin_type)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', TRUE, 'chief_minister')
       RETURNING id, username, email`,
      [
        'mahendra.pratap.singh',
        'Mahendra',
        'Pratap',
        'Singh',
        55,
        'male',
        'Chief Minister',
        'mps@hcm.gov.in',
        aadhaarHash,
        aadhaar.ciphertext,
        aadhaar.iv,
        aadhaar.tag,
        '9000000001',
        passwordHash,
      ]
    );

    console.log('CM Admin created successfully:');
    console.log('  ID       :', result.rows[0].id);
    console.log('  Username :', result.rows[0].username);
    console.log('  Email    :', result.rows[0].email);
    console.log('  Password : CM@Admin2024!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
