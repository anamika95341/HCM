const pool = require('../../config/database');

async function getDashboard() {
  const [admins, pendingAdmins, deos, pendingDeos] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM admins WHERE status = 'active' AND removed_at IS NULL`),
    pool.query(`SELECT COUNT(*) FROM admins WHERE status = 'pending_verification' AND removed_at IS NULL`),
    pool.query(`SELECT COUNT(*) FROM deos WHERE status = 'active' AND removed_at IS NULL`),
    pool.query(`SELECT COUNT(*) FROM deos WHERE status = 'pending_verification' AND removed_at IS NULL`),
  ]);

  return {
    activeAdmins: Number(admins.rows[0].count),
    pendingAdmins: Number(pendingAdmins.rows[0].count),
    activeDeos: Number(deos.rows[0].count),
    pendingDeos: Number(pendingDeos.rows[0].count),
  };
}

async function listAdmins() {
  const result = await pool.query(
    `SELECT a.id, a.username, a.first_name, a.middle_name, a.last_name, a.age, a.sex, a.designation,
            a.email, a.phone_number, a.status, a.is_verified, a.created_at, a.created_by_master_admin_id,
            m.first_name AS creator_first_name, m.last_name AS creator_last_name, m.username AS creator_username
       FROM admins a
       LEFT JOIN master_admins m ON m.id = a.created_by_master_admin_id
      WHERE a.removed_at IS NULL
      ORDER BY a.created_at DESC`
  );
  return result.rows;
}

async function listDeos() {
  const result = await pool.query(
    `SELECT d.id, d.username, d.first_name, d.middle_name, d.last_name, d.age, d.sex, d.designation,
            d.email, d.phone_number, d.status, d.is_verified, d.created_at, d.created_by_master_admin_id,
            m.first_name AS creator_first_name, m.last_name AS creator_last_name, m.username AS creator_username
       FROM deos d
       LEFT JOIN master_admins m ON m.id = d.created_by_master_admin_id
      WHERE d.removed_at IS NULL
      ORDER BY d.created_at DESC`
  );
  return result.rows;
}

async function findAdminByIdentityConflict({ username, email, phoneNumber, aadhaarHash }, db = pool) {
  const result = await db.query(
    `SELECT id, username, email, phone_number, aadhaar_hash
       FROM admins
      WHERE removed_at IS NULL
        AND (username = $1 OR email = $2 OR phone_number = $3 OR aadhaar_hash = $4)`,
    [username, email, phoneNumber, aadhaarHash]
  );
  return result.rows[0] || null;
}

async function deactivateAdmin(adminId, masterAdminId) {
  const result = await pool.query(
    `UPDATE admins
        SET status = 'disabled',
            removed_at = NOW(),
            removed_by_master_admin_id = $2,
            updated_at = NOW()
      WHERE id = $1
        AND removed_at IS NULL
      RETURNING id, username, email, status`,
    [adminId, masterAdminId]
  );
  return result.rows[0] || null;
}

async function deactivateDeo(deoId, masterAdminId) {
  const result = await pool.query(
    `UPDATE deos
        SET status = 'disabled',
            removed_at = NOW(),
            removed_by_master_admin_id = $2,
            updated_at = NOW()
      WHERE id = $1
        AND removed_at IS NULL
      RETURNING id, username, email, status`,
    [deoId, masterAdminId]
  );
  return result.rows[0] || null;
}

module.exports = {
  deactivateAdmin,
  deactivateDeo,
  findAdminByIdentityConflict,
  getDashboard,
  listAdmins,
  listDeos,
};
