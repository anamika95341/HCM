const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../../../config/database');
const logger = require('../../../utils/logger');
const { encryptAadhaar, sha256 } = require('../../../utils/crypto');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    logger.info('Running migration', { file });
    await pool.query(sql);
  }
}

async function seedData() {
  const adminPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
  const masterAdminPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
  const ministerPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
  const deoPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
  const citizenPasswordHash = await bcrypt.hash('ChangeMe123!', 12);

  const citizenAadhaar = encryptAadhaar('234123412346');
  const adminAadhaar = encryptAadhaar('234123412354');
  const deoAadhaar = encryptAadhaar('234123412362');

  await pool.query(
    `INSERT INTO citizens
     (citizen_id, first_name, email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag, age, sex, mobile_number, pincode, city, state, local_mp, password_hash, status, is_verified)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'active',true)
     ON CONFLICT DO NOTHING`,
    ['CTZ-DEMO-0001', 'Demo', 'citizen@example.gov.in', sha256('234123412346'), citizenAadhaar.ciphertext, citizenAadhaar.iv, citizenAadhaar.tag, 30, 'male', '9876543210', '110001', 'New Delhi', 'Delhi', 'Demo MP', citizenPasswordHash]
  );

  await pool.query(
    `INSERT INTO master_admins
     (username, first_name, age, sex, designation, email, phone_number, password_hash)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT DO NOTHING`,
    ['masteradmin.demo', 'Master', 38, 'female', 'Master Administrator', 'masteradmin@example.gov.in', '9876543219', masterAdminPasswordHash]
  );

  await pool.query(
    `INSERT INTO admins
     (username, first_name, age, sex, designation, email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag, phone_number, password_hash, is_verified)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT DO NOTHING`,
    ['admin.demo', 'Admin', 35, 'female', 'Joint Secretary', 'admin@example.gov.in', sha256('234123412354'), adminAadhaar.ciphertext, adminAadhaar.iv, adminAadhaar.tag, '9876543211', adminPasswordHash, true]
  );

  await pool.query(
    `INSERT INTO ministers
      (username, first_name, email, phone_number, password_hash)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING`,
    ['minister.demo', 'Minister', 'minister@example.gov.in', '9876543212', ministerPasswordHash]
  );

  await pool.query(
    `INSERT INTO deos
     (username, first_name, age, sex, email, aadhaar_hash, aadhaar_ciphertext, aadhaar_iv, aadhaar_tag, phone_number, designation, password_hash, status, is_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT DO NOTHING`,
    ['deo.demo', 'DEO', 29, 'other', 'deo@example.gov.in', sha256('234123412362'), deoAadhaar.ciphertext, deoAadhaar.iv, deoAadhaar.tag, '9876543213', 'Verification Officer', deoPasswordHash, 'active', true]
  );
}

async function main() {
  const action = process.argv[2];

  if (action === 'migrate') {
    await runMigrations();
  } else if (action === 'seed') {
    await seedData();
  } else {
    throw new Error('Usage: node seed.js [migrate|seed]');
  }

  await pool.end();
}

main().catch(async (error) => {
  logger.error('Seed script failed', { error });
  await pool.end();
  process.exit(1);
});
