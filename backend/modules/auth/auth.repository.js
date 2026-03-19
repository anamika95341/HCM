const pool = require('../../config/database');

const roleTables = {
  citizen: { table: 'citizens', phoneField: 'mobile_number', loginField: 'citizen_id' },
  admin: { table: 'admins', phoneField: 'phone_number', loginField: 'username' },
  deo: { table: 'deos', phoneField: 'phone_number', loginField: 'username' },
  minister: { table: 'ministers', phoneField: 'phone_number', loginField: 'username' },
};

function getRoleMeta(role) {
  const meta = roleTables[role];
  if (!meta) {
    throw new Error(`Unsupported role: ${role}`);
  }
  return meta;
}

async function findUserById(role, id) {
  const meta = getRoleMeta(role);
  const result = await pool.query(`SELECT * FROM ${meta.table} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function findCitizenByCitizenId(citizenId) {
  const result = await pool.query('SELECT * FROM citizens WHERE citizen_id = $1 AND deleted_at IS NULL', [citizenId]);
  return result.rows[0] || null;
}

async function findCitizenByForgotPassword(aadhaarHash, email) {
  const params = [aadhaarHash];
  let query = 'SELECT * FROM citizens WHERE aadhaar_hash = $1 AND deleted_at IS NULL';

  if (email) {
    query += ' AND email = $2';
    params.push(email);
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

async function findAdminByUsernameOrEmail(identifier) {
  const result = await pool.query(
    'SELECT * FROM admins WHERE username = $1 OR email = $1',
    [identifier]
  );
  return result.rows[0] || null;
}

async function findDeoByUsernameOrEmail(identifier) {
  const result = await pool.query(
    'SELECT * FROM deos WHERE username = $1 OR email = $1',
    [identifier]
  );
  return result.rows[0] || null;
}

async function findMinisterByUsernameOrEmail(identifier) {
  const result = await pool.query(
    'SELECT * FROM ministers WHERE username = $1 OR email = $1',
    [identifier]
  );
  return result.rows[0] || null;
}

async function insertVerificationRecord({ userRole, userId, purpose, channel, destination, expiresAt }) {
  await pool.query(
    `INSERT INTO verification_records (user_role, user_id, purpose, channel, destination, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [userRole, userId, purpose, channel, destination, expiresAt]
  );
}

async function storeRefreshToken({ userRole, userId, tokenHash, jti, expiresAt, replacedByTokenId = null }) {
  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_role, user_id, token_hash, jti, expires_at, replaced_by_token_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [userRole, userId, tokenHash, jti, expiresAt, replacedByTokenId]
  );
  return result.rows[0];
}

async function findActiveRefreshToken(jti) {
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE jti = $1 AND revoked_at IS NULL AND expires_at > NOW()',
    [jti]
  );
  return result.rows[0] || null;
}

async function revokeRefreshToken(id, replacedByTokenId = null) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_token_id = COALESCE($2, replaced_by_token_id), last_used_at = NOW() WHERE id = $1',
    [id, replacedByTokenId]
  );
}

async function updatePassword(role, userId, passwordHash) {
  const meta = getRoleMeta(role);
  await pool.query(
    `UPDATE ${meta.table}
     SET password_hash = $2, password_changed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [userId, passwordHash]
  );
}

async function updateCitizenVerification(userId, citizenId) {
  await pool.query(
    `UPDATE citizens
     SET is_verified = TRUE, status = 'active', citizen_id = $2, updated_at = NOW()
     WHERE id = $1`,
    [userId, citizenId]
  );
}

async function findAdminTokenRecordByJti(jti) {
  const result = await pool.query('SELECT * FROM admin_token_records WHERE jti = $1', [jti]);
  return result.rows[0] || null;
}

async function createAdminTokenRecord({ jti, subjectEmail, designation, expiresAt }) {
  await pool.query(
    `INSERT INTO admin_token_records (jti, subject_email, designation, expires_at)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (jti) DO NOTHING`,
    [jti, subjectEmail || null, designation || null, expiresAt]
  );
}

async function markAdminTokenUsed(jti, adminId) {
  await pool.query(
    'UPDATE admin_token_records SET used_at = NOW(), used_by_admin_id = $2 WHERE jti = $1 AND used_at IS NULL',
    [jti, adminId]
  );
}

module.exports = {
  findUserById,
  findCitizenByCitizenId,
  findCitizenByForgotPassword,
  findAdminByUsernameOrEmail,
  findDeoByUsernameOrEmail,
  findMinisterByUsernameOrEmail,
  insertVerificationRecord,
  storeRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
  updatePassword,
  updateCitizenVerification,
  findAdminTokenRecordByJti,
  createAdminTokenRecord,
  markAdminTokenUsed,
};
