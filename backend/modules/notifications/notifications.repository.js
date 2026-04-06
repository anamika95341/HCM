const pool = require('../../config/database');

function mapNotification(row) {
  return {
    id: row.id,
    recipientRole: row.recipient_role,
    recipientId: row.recipient_id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    body: row.body,
    metadata: row.metadata || {},
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function mapPreferences(row) {
  if (!row) return null;
  return {
    channels: row.channels || {},
    triggers: row.triggers || {},
    digestFrequency: row.digest_frequency,
    deadlineDays: row.deadline_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createNotification({
  recipientRole,
  recipientId,
  eventType,
  entityType = null,
  entityId = null,
  title,
  body,
  metadata = {},
}) {
  const result = await pool.query(
    `INSERT INTO notifications
      (recipient_role, recipient_id, event_type, entity_type, entity_id, title, body, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [recipientRole, recipientId, eventType, entityType, entityId, title, body, metadata]
  );
  return mapNotification(result.rows[0]);
}

async function listNotifications({ recipientRole, recipientId, limit = 20 }) {
  const result = await pool.query(
    `SELECT *
       FROM notifications
      WHERE recipient_role = $1
        AND recipient_id = $2
      ORDER BY created_at DESC
      LIMIT $3`,
    [recipientRole, recipientId, limit]
  );
  return result.rows.map(mapNotification);
}

async function countUnreadNotifications({ recipientRole, recipientId }) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS unread_count
       FROM notifications
      WHERE recipient_role = $1
        AND recipient_id = $2
        AND is_read = FALSE`,
    [recipientRole, recipientId]
  );
  return result.rows[0]?.unread_count || 0;
}

async function markNotificationRead({ recipientRole, recipientId, notificationId }) {
  const result = await pool.query(
    `UPDATE notifications
        SET is_read = TRUE,
            read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND recipient_role = $2
        AND recipient_id = $3
      RETURNING *`,
    [notificationId, recipientRole, recipientId]
  );
  return result.rows[0] ? mapNotification(result.rows[0]) : null;
}

async function markAllNotificationsRead({ recipientRole, recipientId }) {
  const result = await pool.query(
    `UPDATE notifications
        SET is_read = TRUE,
            read_at = COALESCE(read_at, NOW())
      WHERE recipient_role = $1
        AND recipient_id = $2
        AND is_read = FALSE
      RETURNING id`,
    [recipientRole, recipientId]
  );
  return result.rowCount;
}

async function getPreferences({ userRole, userId }) {
  const result = await pool.query(
    `SELECT *
       FROM notification_preferences
      WHERE user_role = $1
        AND user_id = $2`,
    [userRole, userId]
  );
  return mapPreferences(result.rows[0] || null);
}

async function upsertPreferences({ userRole, userId, channels, triggers, digestFrequency, deadlineDays }) {
  const result = await pool.query(
    `INSERT INTO notification_preferences
      (user_role, user_id, channels, triggers, digest_frequency, deadline_days)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_role, user_id)
     DO UPDATE SET
       channels = EXCLUDED.channels,
       triggers = EXCLUDED.triggers,
       digest_frequency = EXCLUDED.digest_frequency,
       deadline_days = EXCLUDED.deadline_days,
       updated_at = NOW()
     RETURNING *`,
    [userRole, userId, channels, triggers, digestFrequency, deadlineDays]
  );
  return mapPreferences(result.rows[0]);
}

async function listActiveAdmins({ excludeUserId = null } = {}) {
  const values = [];
  let where = `
      WHERE status = 'active'
        AND is_verified = TRUE
        AND removed_at IS NULL`;

  if (excludeUserId) {
    values.push(excludeUserId);
    where += ` AND id <> $${values.length}`;
  }

  const result = await pool.query(
    `SELECT id
       FROM admins
      ${where}
      ORDER BY created_at DESC`,
    values
  );
  return result.rows.map((row) => row.id);
}

async function listActiveMasterAdmins({ excludeUserId = null } = {}) {
  const values = [];
  let where = `WHERE status = 'active'`;

  if (excludeUserId) {
    values.push(excludeUserId);
    where += ` AND id <> $${values.length}`;
  }

  const result = await pool.query(
    `SELECT id
       FROM master_admins
      ${where}
      ORDER BY created_at DESC`,
    values
  );
  return result.rows.map((row) => row.id);
}

async function listActiveDeos({ excludeUserId = null } = {}) {
  const values = [];
  let where = `
      WHERE status = 'active'
        AND is_verified = TRUE
        AND removed_at IS NULL`;

  if (excludeUserId) {
    values.push(excludeUserId);
    where += ` AND id <> $${values.length}`;
  }

  const result = await pool.query(
    `SELECT id
       FROM deos
      ${where}
      ORDER BY created_at DESC`,
    values
  );
  return result.rows.map((row) => row.id);
}

module.exports = {
  createNotification,
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPreferences,
  upsertPreferences,
  listActiveAdmins,
  listActiveMasterAdmins,
  listActiveDeos,
};
