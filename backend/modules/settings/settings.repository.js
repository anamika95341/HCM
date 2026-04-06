const pool = require('../../config/database');

async function getCitizenProfile(userId) {
  const result = await pool.query(
    `SELECT c.id,
            c.citizen_id,
            c.first_name,
            c.middle_name,
            c.last_name,
            c.email,
            c.mobile_number,
            c.status,
            c.is_verified,
            c.created_at
       FROM citizens c
      WHERE c.id = $1
        AND c.deleted_at IS NULL`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateCitizenProfile(userId, updates) {
  const result = await pool.query(
    `UPDATE citizens
        SET first_name = COALESCE($2, first_name),
            middle_name = CASE WHEN $3::boolean THEN $4 ELSE middle_name END,
            last_name = CASE WHEN $5::boolean THEN $6 ELSE last_name END,
            email = COALESCE($7, email),
            mobile_number = COALESCE($8, mobile_number),
            updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, citizen_id, first_name, middle_name, last_name, email, mobile_number, status, is_verified, created_at`,
    [
      userId,
      updates.firstName ?? null,
      updates.hasMiddleName ?? false,
      updates.middleName ?? null,
      updates.hasLastName ?? false,
      updates.lastName ?? null,
      updates.email ?? null,
      updates.contact ?? null,
    ]
  );
  return result.rows[0] || null;
}

async function getAdminProfile(userId) {
  const result = await pool.query(
    `SELECT a.id,
            a.username,
            a.first_name,
            a.middle_name,
            a.last_name,
            a.email,
            a.phone_number,
            a.designation,
            a.status,
            a.is_verified,
            a.created_at,
            COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', m.first_name, m.last_name)), ''), m.username, '') AS created_by_name
       FROM admins a
       LEFT JOIN master_admins m ON m.id = a.created_by_master_admin_id
      WHERE a.id = $1
        AND a.removed_at IS NULL`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateAdminProfile(userId, updates) {
  const result = await pool.query(
    `UPDATE admins
        SET first_name = COALESCE($2, first_name),
            middle_name = CASE WHEN $3::boolean THEN $4 ELSE middle_name END,
            last_name = CASE WHEN $5::boolean THEN $6 ELSE last_name END,
            phone_number = COALESCE($7, phone_number),
            updated_at = NOW()
      WHERE id = $1
        AND removed_at IS NULL
      RETURNING id`,
    [
      userId,
      updates.firstName ?? null,
      updates.hasMiddleName ?? false,
      updates.middleName ?? null,
      updates.hasLastName ?? false,
      updates.lastName ?? null,
      updates.contact ?? null,
    ]
  );
  if (!result.rows[0]) return null;
  return getAdminProfile(userId);
}

async function getMasterAdminProfile(userId) {
  const result = await pool.query(
    `SELECT id,
            username,
            first_name,
            middle_name,
            last_name,
            email,
            phone_number,
            designation,
            status,
            created_at
       FROM master_admins
      WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateMasterAdminProfile(userId, updates) {
  const result = await pool.query(
    `UPDATE master_admins
        SET first_name = COALESCE($2, first_name),
            middle_name = CASE WHEN $3::boolean THEN $4 ELSE middle_name END,
            last_name = CASE WHEN $5::boolean THEN $6 ELSE last_name END,
            phone_number = COALESCE($7, phone_number),
            updated_at = NOW()
      WHERE id = $1
      RETURNING id`,
    [
      userId,
      updates.firstName ?? null,
      updates.hasMiddleName ?? false,
      updates.middleName ?? null,
      updates.hasLastName ?? false,
      updates.lastName ?? null,
      updates.contact ?? null,
    ]
  );
  if (!result.rows[0]) return null;
  return getMasterAdminProfile(userId);
}

async function getMinisterProfile(userId) {
  const result = await pool.query(
    `SELECT id,
            username,
            first_name,
            middle_name,
            last_name,
            email,
            phone_number,
            'Minister'::text AS designation,
            status,
            created_at
       FROM ministers
      WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateMinisterProfile(userId, updates) {
  const result = await pool.query(
    `UPDATE ministers
        SET first_name = COALESCE($2, first_name),
            middle_name = CASE WHEN $3::boolean THEN $4 ELSE middle_name END,
            last_name = CASE WHEN $5::boolean THEN $6 ELSE last_name END,
            email = COALESCE($7, email),
            phone_number = COALESCE($8, phone_number),
            updated_at = NOW()
      WHERE id = $1
      RETURNING id`,
    [
      userId,
      updates.firstName ?? null,
      updates.hasMiddleName ?? false,
      updates.middleName ?? null,
      updates.hasLastName ?? false,
      updates.lastName ?? null,
      updates.email ?? null,
      updates.contact ?? null,
    ]
  );
  if (!result.rows[0]) return null;
  return getMinisterProfile(userId);
}

async function getDeoProfile(userId) {
  const result = await pool.query(
    `SELECT d.id,
            d.username,
            d.first_name,
            d.middle_name,
            d.last_name,
            d.email,
            d.phone_number,
            d.designation,
            d.status,
            d.is_verified,
            d.created_at,
            COALESCE(
              NULLIF(BTRIM(CONCAT_WS(' ', a.first_name, a.last_name)), ''),
              a.username,
              NULLIF(BTRIM(CONCAT_WS(' ', m.first_name, m.last_name)), ''),
              m.username,
              ''
            ) AS created_by_name
       FROM deos d
       LEFT JOIN admins a ON a.id = d.created_by_admin_id
       LEFT JOIN master_admins m ON m.id = d.created_by_master_admin_id
      WHERE d.id = $1
        AND d.removed_at IS NULL`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateDeoProfile(userId, updates) {
  const result = await pool.query(
    `UPDATE deos
        SET phone_number = COALESCE($2, phone_number),
            updated_at = NOW()
      WHERE id = $1
        AND removed_at IS NULL
      RETURNING id`,
    [userId, updates.contact ?? null]
  );
  if (!result.rows[0]) return null;
  return getDeoProfile(userId);
}

const profileLoaders = {
  citizen: getCitizenProfile,
  admin: getAdminProfile,
  masteradmin: getMasterAdminProfile,
  minister: getMinisterProfile,
  deo: getDeoProfile,
};

const profileUpdaters = {
  citizen: updateCitizenProfile,
  admin: updateAdminProfile,
  masteradmin: updateMasterAdminProfile,
  minister: updateMinisterProfile,
  deo: updateDeoProfile,
};

async function getProfile(role, userId) {
  return profileLoaders[role](userId);
}

async function updateProfile(role, userId, updates) {
  return profileUpdaters[role](userId, updates);
}

module.exports = {
  getProfile,
  updateProfile,
};
