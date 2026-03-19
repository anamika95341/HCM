const pool = require('../config/database');

async function writeAuditLog({ actorRole, actorId, entityType, entityId, action, ipAddress, userAgent, metadata = {} }) {
  await pool.query(
    `INSERT INTO audit_logs (actor_role, actor_id, entity_type, entity_id, action, ip_address, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [actorRole, actorId || null, entityType, entityId, action, ipAddress || null, userAgent || null, metadata]
  );
}

module.exports = { writeAuditLog };
