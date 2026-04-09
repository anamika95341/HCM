const pool = require('../../config/database');

const roleTables = {
  citizen: { table: 'citizens', phoneField: 'mobile_number', loginField: 'citizen_id' },
  admin: { table: 'admins', phoneField: 'phone_number', loginField: 'username' },
  masteradmin: { table: 'master_admins', phoneField: 'phone_number', loginField: 'username' },
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

async function findActiveUserById(role, id) {
  let result;
  if (role === 'citizen') {
    result = await pool.query(
      `SELECT * FROM citizens
        WHERE id = $1
          AND deleted_at IS NULL
          AND status = 'active'
          AND is_verified = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  }

  if (role === 'admin') {
    result = await pool.query(
      `SELECT * FROM admins
        WHERE id = $1
          AND removed_at IS NULL
          AND status = 'active'
          AND is_verified = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  }

  if (role === 'deo') {
    result = await pool.query(
      `SELECT * FROM deos
        WHERE id = $1
          AND removed_at IS NULL
          AND status = 'active'
          AND is_verified = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  }

  if (role === 'minister') {
    result = await pool.query(
      `SELECT * FROM ministers
        WHERE id = $1
          AND status = 'active'`,
      [id]
    );
    return result.rows[0] || null;
  }

  if (role === 'masteradmin') {
    result = await pool.query(
      `SELECT * FROM master_admins
        WHERE id = $1
          AND status = 'active'`,
      [id]
    );
    return result.rows[0] || null;
  }

  throw new Error(`Unsupported role: ${role}`);
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
    'SELECT * FROM admins WHERE removed_at IS NULL AND (username = $1 OR email = $1)',
    [identifier]
  );
  return result.rows[0] || null;
}

async function findMasterAdminByUsernameOrEmail(identifier) {
  const result = await pool.query(
    'SELECT * FROM master_admins WHERE username = $1 OR email = $1',
    [identifier]
  );
  return result.rows[0] || null;
}

async function findDeoByUsernameOrEmail(identifier) {
  const result = await pool.query(
    'SELECT * FROM deos WHERE removed_at IS NULL AND (username = $1 OR email = $1)',
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

async function markVerificationRecordVerified({ userRole, userId, purpose }) {
  await pool.query(
    `UPDATE verification_records
        SET verified_at = NOW()
      WHERE user_role = $1
        AND user_id = $2
        AND purpose = $3
        AND verified_at IS NULL`,
    [userRole, userId, purpose]
  );
}

async function clearVerificationRecords({ userRole, userId, purpose }) {
  await pool.query(
    `DELETE FROM verification_records
      WHERE user_role = $1
        AND user_id = $2
        AND purpose = $3
        AND verified_at IS NULL`,
    [userRole, userId, purpose]
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

async function findRefreshTokenByJti(jti) {
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE jti = $1',
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

async function getPasswordChangedAt(role, userId) {
  const meta = getRoleMeta(role);
  const result = await pool.query(
    `SELECT password_changed_at
       FROM ${meta.table}
      WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.password_changed_at || null;
}

async function updateCitizenVerification(userId, citizenId) {
  await pool.query(
    `UPDATE citizens
     SET is_verified = TRUE, status = 'active', citizen_id = $2, updated_at = NOW()
     WHERE id = $1`,
    [userId, citizenId]
  );
}

async function updateDeoVerification(userId) {
  await pool.query(
    `UPDATE deos
     SET is_verified = TRUE, status = 'active', updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

async function updateAdminVerification(userId) {
  await pool.query(
    `UPDATE admins
     SET is_verified = TRUE, status = 'active', updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

async function revokeAllUserRefreshTokens(userRole, userId) {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_role = $1
       AND user_id = $2
       AND revoked_at IS NULL
       AND expires_at > NOW()`,
    [userRole, userId]
  );
}

module.exports = {
  findUserById,
  findActiveUserById,
  findCitizenByCitizenId,
  findCitizenByForgotPassword,
  findAdminByUsernameOrEmail,
  findMasterAdminByUsernameOrEmail,
  findDeoByUsernameOrEmail,
  findMinisterByUsernameOrEmail,
  insertVerificationRecord,
  markVerificationRecordVerified,
  clearVerificationRecords,
  storeRefreshToken,
  findActiveRefreshToken,
  findRefreshTokenByJti,
  revokeRefreshToken,
  updatePassword,
  getPasswordChangedAt,
  updateCitizenVerification,
  updateAdminVerification,
  updateDeoVerification,
  revokeAllUserRefreshTokens,
};
