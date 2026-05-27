const createHttpError = require('http-errors');
const authRepository = require('../auth/auth.repository');
const notificationsRepository = require('./notifications.repository');
const logger = require('../../utils/logger');
// WHY: Email/SMS delivery enqueued to BullMQ workers so the HTTP request cycle
// is not blocked by SMTP/SMS latency (up to 10s per SMTP send).
const { enqueue, JOBS, buildJobId } = require('../../queues/index');
const {
  publishAppointmentStatusUpdate,
  publishGrievanceStatusUpdate,
  publishNotificationCreated,
} = require('../../realtime/wsPublisher');

const ROLE_DEFAULTS = {
  citizen: {
    channels: { app: true, email: true, sms: false },
    triggers: { appointmentStatus: true, grievanceStatus: true },
    digestFrequency: 'realtime',
    deadlineDays: 3,
  },
  admin: {
    channels: { app: true, email: true, sms: false },
    triggers: { newTask: true, moved: true, deadline: true, escalation: true, approval: true },
    digestFrequency: 'realtime',
    deadlineDays: 3,
  },
  masteradmin: {
    channels: { app: true, email: true, sms: false },
    triggers: { adminCreated: true, deoCreated: true, accountVerified: true, escalation: true },
    digestFrequency: 'realtime',
    deadlineDays: 3,
  },
  minister: {
    channels: { app: true, email: true, sms: false },
    triggers: { newAppointment: true, appointmentChange: true, deadline: true, escalation: true, approval: true },
    digestFrequency: 'realtime',
    deadlineDays: 3,
  },
  deo: {
    channels: { app: true, email: true, sms: false },
    triggers: { newTask: true, deadline: true },
    digestFrequency: 'daily',
    deadlineDays: 3,
  },
};

function getDefaultPreferences(role) {
  return ROLE_DEFAULTS[role] || ROLE_DEFAULTS.citizen;
}

function mergePreferences(role, stored) {
  const defaults = getDefaultPreferences(role);
  return {
    channels: { ...defaults.channels, ...(stored?.channels || {}) },
    triggers: { ...defaults.triggers, ...(stored?.triggers || {}) },
    digestFrequency: stored?.digestFrequency || defaults.digestFrequency,
    deadlineDays: stored?.deadlineDays || defaults.deadlineDays,
  };
}

function normalizeChannels(channels = {}, defaults) {
  return {
    app: channels.app == null ? defaults.app : Boolean(channels.app),
    email: channels.email == null ? defaults.email : Boolean(channels.email),
    sms: channels.sms == null ? defaults.sms : Boolean(channels.sms),
  };
}

function normalizeTriggers(triggers = {}, defaults) {
  const normalized = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    normalized[key] = triggers[key] == null ? Boolean(fallback) : Boolean(triggers[key]);
  }
  return normalized;
}

function normalizeDigestFrequency(value, fallback) {
  return ['realtime', 'daily', 'weekly'].includes(value) ? value : fallback;
}

function normalizeDeadlineDays(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(14, Math.max(1, parsed));
}

async function getNotificationPreferences(role, userId) {
  const stored = await notificationsRepository.getPreferences({ userRole: role, userId });
  return mergePreferences(role, stored);
}

async function updateNotificationPreferences(role, userId, payload = {}) {
  const defaults = getDefaultPreferences(role);
  const current = await getNotificationPreferences(role, userId);
  const channels = normalizeChannels(payload.channels, current.channels);
  const triggers = normalizeTriggers(payload.triggers, current.triggers);
  const digestFrequency = normalizeDigestFrequency(payload.digestFrequency, current.digestFrequency || defaults.digestFrequency);
  const deadlineDays = normalizeDeadlineDays(payload.deadlineDays, current.deadlineDays || defaults.deadlineDays);

  return notificationsRepository.upsertPreferences({
    userRole: role,
    userId,
    channels,
    triggers,
    digestFrequency,
    deadlineDays,
  });
}

async function listNotifications(role, userId, { limit = 20 } = {}) {
  const [notifications, unreadCount, preferences] = await Promise.all([
    notificationsRepository.listNotifications({ recipientRole: role, recipientId: userId, limit }),
    notificationsRepository.countUnreadNotifications({ recipientRole: role, recipientId: userId }),
    getNotificationPreferences(role, userId),
  ]);

  return { notifications, unreadCount, preferences };
}

async function markNotificationRead(role, userId, notificationId) {
  const notification = await notificationsRepository.markNotificationRead({
    recipientRole: role,
    recipientId: userId,
    notificationId,
  });

  if (!notification) {
    throw createHttpError(404, 'Notification not found');
  }

  const unreadCount = await notificationsRepository.countUnreadNotifications({
    recipientRole: role,
    recipientId: userId,
  });

  return { notification, unreadCount };
}

async function markAllNotificationsRead(role, userId) {
  await notificationsRepository.markAllNotificationsRead({
    recipientRole: role,
    recipientId: userId,
  });

  return { unreadCount: 0 };
}

async function deliverOutOfBandChannels(recipientRole, recipientId, preferences, notification) {
  // WHY: Skip for digest users — their batch digest jobs run separately (not implemented yet).
  if (preferences.digestFrequency !== 'realtime') {
    return;
  }

  const user = await authRepository.findUserById(recipientRole, recipientId);
  if (!user) {
    return;
  }

  const correlationId = notification.id ? `notif:${notification.id}` : undefined;

  if (preferences.channels.email && user.email) {
    // WHY: jobId = notif-email:{notification.id} ensures idempotency —
    // if this function is called twice for the same notification (e.g. API retry),
    // BullMQ deduplicates the job while it's pending/active.
    enqueue(JOBS.SEND_EMAIL, {
      to: user.email,
      subject: notification.title,
      text: notification.body,
      correlationId,
      context: { entityType: notification.entityType || notification.entity_type, entityId: notification.entityId || notification.entity_id, recipientRole, recipientId },
    }, {
      jobId: notification.id ? buildJobId('notif-email', notification.id) : undefined,
    }).catch((err) => {
      logger.warn('Failed to enqueue notification email job', {
        recipientRole,
        recipientId,
        notificationId: notification.id,
        error: err.message,
      });
    });
  }

  const phone = user.mobile_number || user.phone_number;
  if (preferences.channels.sms && phone) {
    enqueue(JOBS.SEND_SMS, {
      to: phone,
      message: notification.body,
      correlationId,
      context: { recipientRole, recipientId },
    }, {
      jobId: notification.id ? buildJobId('notif-sms', notification.id) : undefined,
    }).catch((err) => {
      logger.warn('Failed to enqueue notification SMS job', {
        recipientRole,
        recipientId,
        notificationId: notification.id,
        error: err.message,
      });
    });
  }
}

async function createNotification({
  recipientRole,
  recipientId,
  eventType,
  triggerKey,
  entityType = null,
  entityId = null,
  title,
  body,
  metadata = {},
}) {
  const preferences = await getNotificationPreferences(recipientRole, recipientId);
  const triggerEnabled = triggerKey ? preferences.triggers[triggerKey] !== false : true;
  if (!triggerEnabled) {
    return null;
  }

  const notification = await notificationsRepository.createNotification({
    recipientRole,
    recipientId,
    eventType,
    entityType,
    entityId,
    title,
    body,
    metadata,
  });

  await deliverOutOfBandChannels(recipientRole, recipientId, preferences, notification);

  if (preferences.channels.app) {
    const unreadCount = await notificationsRepository.countUnreadNotifications({
      recipientRole,
      recipientId,
    });
    await publishNotificationCreated({
      recipientRole,
      recipientId,
      notification,
      unreadCount,
    });
  }

  return notification;
}

function toStatusLabel(status) {
  return String(status || '')
    .split('_')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

async function notifyCitizenAppointmentStatusUpdate({ citizenId, appointmentId, status, note }) {
  try {
    await publishAppointmentStatusUpdate({ citizenId, appointmentId, status, note });

    const statusLabel = toStatusLabel(status);
    const summary = note
      ? `Your appointment request is now ${statusLabel}. ${note}`
      : `Your appointment request is now ${statusLabel}.`;

    await createNotification({
      recipientRole: 'citizen',
      recipientId: citizenId,
      eventType: 'appointment.status.updated',
      triggerKey: 'appointmentStatus',
      entityType: 'appointment',
      entityId: appointmentId,
      title: `Appointment ${statusLabel}`,
      body: summary,
      metadata: { status, note: note || null, appointmentId },
    });
  } catch (error) {
    logger.error('Appointment notification dispatch failed', {
      citizenId,
      appointmentId,
      status,
      error,
    });
  }
}

async function notifyCitizenGrievanceStatusUpdate({ citizenId, grievanceId, status, note }) {
  try {
    await publishGrievanceStatusUpdate({ citizenId, grievanceId, status, note });

    const statusLabel = toStatusLabel(status);
    const summary = note
      ? `Your grievance is now ${statusLabel}. ${note}`
      : `Your grievance is now ${statusLabel}.`;

    await createNotification({
      recipientRole: 'citizen',
      recipientId: citizenId,
      eventType: 'grievance.status.updated',
      triggerKey: 'grievanceStatus',
      entityType: 'grievance',
      entityId: grievanceId,
      title: `Grievance ${statusLabel}`,
      body: summary,
      metadata: { status, note: note || null, grievanceId },
    });
  } catch (error) {
    logger.error('Grievance notification dispatch failed', {
      citizenId,
      grievanceId,
      status,
      error,
    });
  }
}

async function notifyRecipients(recipientRole, recipientIds, buildNotification) {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(recipientIds.filter(Boolean))];
  const results = await Promise.all(uniqueIds.map(async (recipientId) => {
    try {
      const payload = await buildNotification(recipientId);
      if (!payload) return null;
      return createNotification({
        recipientRole,
        recipientId,
        ...payload,
      });
    } catch (error) {
      logger.error('Recipient notification dispatch failed', {
        recipientRole,
        recipientId,
        error,
      });
      return null;
    }
  }));

  return results.filter(Boolean);
}

async function notifyActiveAdmins({ excludeAdminId = null, buildNotification }) {
  const adminIds = await notificationsRepository.listActiveAdmins({ excludeUserId: excludeAdminId });
  return notifyRecipients('admin', adminIds, buildNotification);
}

async function notifyAdmin(adminId, notification) {
  if (!adminId) return null;
  try {
    return await createNotification({
      recipientRole: 'admin',
      recipientId: adminId,
      ...notification,
    });
  } catch (error) {
    logger.error('Admin notification dispatch failed', {
      adminId,
      error,
    });
    return null;
  }
}

async function notifyActiveMasterAdmins({ excludeMasterAdminId = null, buildNotification }) {
  const recipientIds = await notificationsRepository.listActiveMasterAdmins({ excludeUserId: excludeMasterAdminId });
  return notifyRecipients('masteradmin', recipientIds, buildNotification);
}

async function notifyMasterAdminAccountCreated({ accountRole, accountId, createdByMasterAdminId, username, email }) {
  const triggerKey = accountRole === 'admin' ? 'adminCreated' : 'deoCreated';
  const roleLabel = accountRole === 'admin' ? 'Admin' : 'DEO';

  return notifyActiveMasterAdmins({
    buildNotification: async () => ({
      eventType: `${accountRole}.account.created`,
      triggerKey,
      entityType: accountRole,
      entityId: accountId,
      title: `New ${roleLabel} Account Created`,
      body: `${roleLabel} account ${username || email || accountId} was created successfully.`,
      metadata: {
        accountRole,
        accountId,
        createdByMasterAdminId,
        username: username || null,
        email: email || null,
      },
    }),
  });
}

async function notifyMasterAdminAccountVerified({ accountRole, accountId, usernameOrEmail }) {
  const roleLabel = accountRole === 'admin' ? 'Admin' : 'DEO';

  return notifyActiveMasterAdmins({
    buildNotification: async () => ({
      eventType: `${accountRole}.account.verified`,
      triggerKey: 'accountVerified',
      entityType: accountRole,
      entityId: accountId,
      title: `${roleLabel} Account Verified`,
      body: `${roleLabel} account ${usernameOrEmail || accountId} completed verification.`,
      metadata: {
        accountRole,
        accountId,
        usernameOrEmail: usernameOrEmail || null,
      },
    }),
  });
}

async function notifyMasterAdminSecurityAlert({ affectedRole, affectedUserId, severity, email = null }) {
  const severityLabel = severity === 'manual_unlock_required' ? 'Manual Unlock Required' : 'Temporary Lockout';
  const body = email
    ? `${affectedRole} account ${email} entered ${severity === 'manual_unlock_required' ? 'manual unlock required' : 'temporary lockout'} state after repeated login failures.`
    : `${affectedRole} account ${affectedUserId} entered ${severity === 'manual_unlock_required' ? 'manual unlock required' : 'temporary lockout'} state after repeated login failures.`;

  return notifyActiveMasterAdmins({
    buildNotification: async () => ({
      eventType: 'security.lockout',
      triggerKey: 'escalation',
      entityType: affectedRole,
      entityId: affectedUserId,
      title: `Security Alert: ${severityLabel}`,
      body,
      metadata: {
        affectedRole,
        affectedUserId,
        severity,
        email,
      },
    }),
  });
}

async function notifyDeoVerificationAssigned({ deoId, appointmentId, adminId, appointmentTitle }) {
  return notifyRecipients('deo', [deoId], async () => ({
    eventType: 'appointment.verification.assigned',
    triggerKey: 'newTask',
    entityType: 'appointment',
    entityId: appointmentId,
    title: 'New Verification Task Assigned',
    body: `Appointment ${appointmentTitle || appointmentId} has been assigned to you for verification.`,
    metadata: {
      appointmentId,
      assignedByAdminId: adminId,
      deoId,
    },
  }));
}

async function notifyAdminAppointmentVerified({ adminId, appointmentId, deoId, appointmentTitle }) {
  return notifyAdmin(adminId, {
    eventType: 'appointment.verified.by_deo',
    triggerKey: 'approval',
    entityType: 'appointment',
    entityId: appointmentId,
    title: 'Appointment Verified by DEO',
    body: `Appointment ${appointmentTitle || appointmentId} has been verified by the assigned DEO and is ready for scheduling.`,
    metadata: {
      appointmentId,
      deoId,
      adminId,
    },
  });
}

async function notifyAdminPoolAppointmentSubmitted({ appointmentId, appointmentTitle, citizenId, assignedAdminId = null }) {
  if (assignedAdminId) {
    return notifyAdmin(assignedAdminId, {
      eventType: 'appointment.submitted',
      triggerKey: 'newTask',
      entityType: 'appointment',
      entityId: appointmentId,
      title: 'New Appointment Request Submitted',
      body: `Appointment ${appointmentTitle || appointmentId} has been submitted and routed to your desk.`,
      metadata: {
        appointmentId,
        citizenId,
        assignedAdminId,
      },
    });
  }

  return notifyActiveAdmins({
    buildNotification: async () => ({
      eventType: 'appointment.submitted',
      triggerKey: 'newTask',
      entityType: 'appointment',
      entityId: appointmentId,
      title: 'New Appointment Request in Appointment Pool',
      body: `Appointment ${appointmentTitle || appointmentId} has been submitted by a citizen and is now available in the appointment pool.`,
      metadata: {
        appointmentId,
        citizenId,
      },
    }),
  });
}

async function notifyAdminPoolGrievanceSubmitted({ grievanceId, grievanceTitle, citizenId }) {
  return notifyActiveAdmins({
    buildNotification: async () => ({
      eventType: 'grievance.submitted',
      triggerKey: 'newTask',
      entityType: 'grievance',
      entityId: grievanceId,
      title: 'New Grievance in Grievance Pool',
      body: `Grievance ${grievanceTitle || grievanceId} has been submitted by a citizen and is now available in the grievance pool.`,
      metadata: {
        grievanceId,
        citizenId,
      },
    }),
  });
}

async function notifyMinisterAppointmentScheduled({
  ministerId,
  appointmentId,
  appointmentTitle,
  scheduledAt,
  location,
  adminId,
  isRescheduled = false,
  source = 'admin_schedule',
  entityType = 'appointment',
}) {
  return notifyRecipients('minister', [ministerId], async () => ({
    eventType: isRescheduled ? 'appointment.rescheduled' : 'appointment.scheduled',
    triggerKey: 'newAppointment',
    entityType,
    entityId: appointmentId,
    title: isRescheduled ? 'Appointment Rescheduled on Your Calendar' : 'New Appointment Scheduled on Your Calendar',
    body: `${appointmentTitle || appointmentId} is ${isRescheduled ? 'rescheduled' : 'scheduled'} for ${scheduledAt}${location ? ` at ${location}` : ''}.`,
    metadata: {
      appointmentId,
      ministerId,
      adminId: adminId || null,
      scheduledAt,
      location: location || null,
      source,
    },
  }));
}

async function notifyMinisterAppointmentChanged({ ministerId, appointmentId, appointmentTitle, changeType, location, scheduledAt, actorRole }) {
  return notifyRecipients('minister', [ministerId], async () => ({
    eventType: `appointment.${changeType}`,
    triggerKey: 'appointmentChange',
    entityType: 'appointment',
    entityId: appointmentId,
    title: changeType === 'cancelled' ? 'Appointment Cancelled' : 'Appointment Updated',
    body: changeType === 'cancelled'
      ? `${appointmentTitle || appointmentId} has been cancelled.`
      : `${appointmentTitle || appointmentId} has been updated${scheduledAt ? ` for ${scheduledAt}` : ''}${location ? ` at ${location}` : ''}.`,
    metadata: {
      appointmentId,
      ministerId,
      changeType,
      location: location || null,
      scheduledAt: scheduledAt || null,
      actorRole: actorRole || null,
    },
  }));
}

async function notifyAdminScheduledAppointmentUpcoming({ adminId, entityType, entityId, title, scheduledAt }) {
  return notifyAdmin(adminId, {
    eventType: `${entityType}.scheduled.upcoming`,
    triggerKey: 'deadline',
    entityType,
    entityId,
    title: 'Upcoming Scheduled Appointment',
    body: `${title || entityId} is scheduled for ${scheduledAt}.`,
    metadata: {
      entityType,
      entityId,
      adminId,
      scheduledAt,
    },
  });
}

async function notifyAdminScheduledAppointmentCompleted({ adminId, entityType, entityId, title, completedByRole }) {
  return notifyAdmin(adminId, {
    eventType: `${entityType}.scheduled.completed`,
    triggerKey: 'moved',
    entityType,
    entityId,
    title: 'Scheduled Appointment Completed',
    body: `${title || entityId} has been completed${completedByRole ? ` by ${completedByRole}` : ''}.`,
    metadata: {
      entityType,
      entityId,
      adminId,
      completedByRole: completedByRole || null,
    },
  });
}

async function notifyDeoNewGrievance({ grievanceId, grievanceTitle, citizenId }) {
  const deoIds = await notificationsRepository.listActiveDeos();
  return notifyRecipients('deo', deoIds, async () => ({
    eventType: 'grievance.submitted',
    triggerKey: 'newTask',
    entityType: 'grievance',
    entityId: grievanceId,
    title: 'New Grievance Requires Letterhead',
    body: `Grievance ${grievanceTitle || grievanceId} has been submitted. Please generate the letterhead.`,
    metadata: { grievanceId, citizenId },
  }));
}

async function notifyCmAdminNewGrievance({ grievanceId, grievanceTitle, citizenId }) {
  const adminRepository = require('../admin/admin.repository');
  const cmAdmin = await adminRepository.findChiefMinisterAdmin();
  if (!cmAdmin) return null;
  return notifyAdmin(cmAdmin.id, {
    eventType: 'grievance.submitted',
    triggerKey: 'newTask',
    entityType: 'grievance',
    entityId: grievanceId,
    title: 'New Grievance Submitted',
    body: `Grievance ${grievanceTitle || grievanceId} has been submitted by a citizen.`,
    metadata: { grievanceId, citizenId },
  });
}

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notifyCitizenAppointmentStatusUpdate,
  notifyCitizenGrievanceStatusUpdate,
  notifyAdmin,
  notifyActiveAdmins,
  notifyActiveMasterAdmins,
  notifyMasterAdminAccountCreated,
  notifyMasterAdminAccountVerified,
  notifyMasterAdminSecurityAlert,
  notifyDeoVerificationAssigned,
  notifyAdminAppointmentVerified,
  notifyAdminPoolAppointmentSubmitted,
  notifyAdminPoolGrievanceSubmitted,
  notifyMinisterAppointmentScheduled,
  notifyMinisterAppointmentChanged,
  notifyAdminScheduledAppointmentUpcoming,
  notifyAdminScheduledAppointmentCompleted,
  notifyDeoNewGrievance,
  notifyCmAdminNewGrievance,
};
