const createHttpError = require('http-errors');
const authRepository = require('../auth/auth.repository');
const notificationsRepository = require('./notifications.repository');
const { sendMail } = require('../../utils/mailer');
const { sendSms } = require('../../utils/smsService');
const logger = require('../../utils/logger');
const {
  publishMeetingStatusUpdate,
  publishComplaintStatusUpdate,
  publishNotificationCreated,
} = require('../../realtime/wsPublisher');

const ROLE_DEFAULTS = {
  citizen: {
    channels: { app: true, email: true, sms: false },
    triggers: { meetingStatus: true, complaintStatus: true },
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
    triggers: { newMeeting: true, meetingChange: true, deadline: true, escalation: true, approval: true },
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
  if (preferences.digestFrequency !== 'realtime') {
    return;
  }

  const user = await authRepository.findUserById(recipientRole, recipientId);
  if (!user) {
    return;
  }

  if (preferences.channels.email && user.email) {
    await sendMail({
      to: user.email,
      subject: notification.title,
      text: notification.body,
    });
  }

  const phone = user.mobile_number || user.phone_number;
  if (preferences.channels.sms && phone) {
    await sendSms({
      to: phone,
      message: notification.body,
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

async function notifyCitizenMeetingStatusUpdate({ citizenId, meetingId, status, note }) {
  try {
    await publishMeetingStatusUpdate({ citizenId, meetingId, status, note });

    const statusLabel = toStatusLabel(status);
    const summary = note
      ? `Your meeting request is now ${statusLabel}. ${note}`
      : `Your meeting request is now ${statusLabel}.`;

    await createNotification({
      recipientRole: 'citizen',
      recipientId: citizenId,
      eventType: 'meeting.status.updated',
      triggerKey: 'meetingStatus',
      entityType: 'meeting',
      entityId: meetingId,
      title: `Meeting ${statusLabel}`,
      body: summary,
      metadata: { status, note: note || null, meetingId },
    });
  } catch (error) {
    logger.error('Meeting notification dispatch failed', {
      citizenId,
      meetingId,
      status,
      error,
    });
  }
}

async function notifyCitizenComplaintStatusUpdate({ citizenId, complaintId, status, note }) {
  try {
    await publishComplaintStatusUpdate({ citizenId, complaintId, status, note });

    const statusLabel = toStatusLabel(status);
    const summary = note
      ? `Your complaint is now ${statusLabel}. ${note}`
      : `Your complaint is now ${statusLabel}.`;

    await createNotification({
      recipientRole: 'citizen',
      recipientId: citizenId,
      eventType: 'complaint.status.updated',
      triggerKey: 'complaintStatus',
      entityType: 'complaint',
      entityId: complaintId,
      title: `Complaint ${statusLabel}`,
      body: summary,
      metadata: { status, note: note || null, complaintId },
    });
  } catch (error) {
    logger.error('Complaint notification dispatch failed', {
      citizenId,
      complaintId,
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

async function notifyDeoVerificationAssigned({ deoId, meetingId, adminId, meetingTitle }) {
  return notifyRecipients('deo', [deoId], async () => ({
    eventType: 'meeting.verification.assigned',
    triggerKey: 'newTask',
    entityType: 'meeting',
    entityId: meetingId,
    title: 'New Verification Task Assigned',
    body: `Meeting ${meetingTitle || meetingId} has been assigned to you for verification.`,
    metadata: {
      meetingId,
      assignedByAdminId: adminId,
      deoId,
    },
  }));
}

async function notifyAdminMeetingVerified({ adminId, meetingId, deoId, meetingTitle }) {
  return notifyAdmin(adminId, {
    eventType: 'meeting.verified.by_deo',
    triggerKey: 'approval',
    entityType: 'meeting',
    entityId: meetingId,
    title: 'Meeting Verified by DEO',
    body: `Meeting ${meetingTitle || meetingId} has been verified by the assigned DEO and is ready for scheduling.`,
    metadata: {
      meetingId,
      deoId,
      adminId,
    },
  });
}

async function notifyAdminPoolMeetingSubmitted({ meetingId, meetingTitle, citizenId, assignedAdminId = null }) {
  if (assignedAdminId) {
    return notifyAdmin(assignedAdminId, {
      eventType: 'meeting.submitted',
      triggerKey: 'newTask',
      entityType: 'meeting',
      entityId: meetingId,
      title: 'New Meeting Request Submitted',
      body: `Meeting ${meetingTitle || meetingId} has been submitted and routed to your desk.`,
      metadata: {
        meetingId,
        citizenId,
        assignedAdminId,
      },
    });
  }

  return notifyActiveAdmins({
    buildNotification: async () => ({
      eventType: 'meeting.submitted',
      triggerKey: 'newTask',
      entityType: 'meeting',
      entityId: meetingId,
      title: 'New Meeting Request in Meeting Pool',
      body: `Meeting ${meetingTitle || meetingId} has been submitted by a citizen and is now available in the meeting pool.`,
      metadata: {
        meetingId,
        citizenId,
      },
    }),
  });
}

async function notifyAdminPoolComplaintSubmitted({ complaintId, complaintTitle, citizenId }) {
  return notifyActiveAdmins({
    buildNotification: async () => ({
      eventType: 'complaint.submitted',
      triggerKey: 'newTask',
      entityType: 'complaint',
      entityId: complaintId,
      title: 'New Complaint in Complaint Pool',
      body: `Complaint ${complaintTitle || complaintId} has been submitted by a citizen and is now available in the complaint pool.`,
      metadata: {
        complaintId,
        citizenId,
      },
    }),
  });
}

async function notifyAdminComplaintEscalatedToPool({ complaintId, complaintTitle, actorAdminId, note }) {
  return notifyActiveAdmins({
    excludeAdminId: actorAdminId,
    buildNotification: async () => ({
      eventType: 'complaint.escalated.to_pool',
      triggerKey: 'escalation',
      entityType: 'complaint',
      entityId: complaintId,
      title: 'Complaint Escalated to Pool',
      body: note
        ? `Complaint ${complaintTitle || complaintId} was escalated back to the complaint pool. ${note}`
        : `Complaint ${complaintTitle || complaintId} was escalated back to the complaint pool.`,
      metadata: {
        complaintId,
        actorAdminId,
        note: note || null,
      },
    }),
  });
}

async function notifyAdminComplaintReassigned({ complaintId, complaintTitle, actorAdminId, targetAdminId, reason }) {
  return notifyAdmin(targetAdminId, {
    eventType: 'complaint.reassigned',
    triggerKey: 'newTask',
    entityType: 'complaint',
    entityId: complaintId,
    title: 'Complaint Reassigned to You',
    body: reason
      ? `Complaint ${complaintTitle || complaintId} was reassigned to your queue. ${reason}`
      : `Complaint ${complaintTitle || complaintId} was reassigned to your queue.`,
    metadata: {
      complaintId,
      actorAdminId,
      targetAdminId,
      reason: reason || null,
    },
  });
}

async function notifyMinisterMeetingScheduled({
  ministerId,
  meetingId,
  meetingTitle,
  scheduledAt,
  location,
  adminId,
  isRescheduled = false,
  source = 'admin_schedule',
  entityType = 'meeting',
}) {
  return notifyRecipients('minister', [ministerId], async () => ({
    eventType: isRescheduled ? 'meeting.rescheduled' : 'meeting.scheduled',
    triggerKey: 'newMeeting',
    entityType,
    entityId: meetingId,
    title: isRescheduled ? 'Meeting Rescheduled on Your Calendar' : 'New Meeting Scheduled on Your Calendar',
    body: `${meetingTitle || meetingId} is ${isRescheduled ? 'rescheduled' : 'scheduled'} for ${scheduledAt}${location ? ` at ${location}` : ''}.`,
    metadata: {
      meetingId,
      ministerId,
      adminId: adminId || null,
      scheduledAt,
      location: location || null,
      source,
    },
  }));
}

async function notifyMinisterMeetingChanged({ ministerId, meetingId, meetingTitle, changeType, location, scheduledAt, actorRole }) {
  return notifyRecipients('minister', [ministerId], async () => ({
    eventType: `meeting.${changeType}`,
    triggerKey: 'meetingChange',
    entityType: 'meeting',
    entityId: meetingId,
    title: changeType === 'cancelled' ? 'Meeting Cancelled' : 'Meeting Updated',
    body: changeType === 'cancelled'
      ? `${meetingTitle || meetingId} has been cancelled.`
      : `${meetingTitle || meetingId} has been updated${scheduledAt ? ` for ${scheduledAt}` : ''}${location ? ` at ${location}` : ''}.`,
    metadata: {
      meetingId,
      ministerId,
      changeType,
      location: location || null,
      scheduledAt: scheduledAt || null,
      actorRole: actorRole || null,
    },
  }));
}

async function notifyAdminScheduledMeetingUpcoming({ adminId, entityType, entityId, title, scheduledAt }) {
  return notifyAdmin(adminId, {
    eventType: `${entityType}.scheduled.upcoming`,
    triggerKey: 'deadline',
    entityType,
    entityId,
    title: 'Upcoming Scheduled Meeting',
    body: `${title || entityId} is scheduled for ${scheduledAt}.`,
    metadata: {
      entityType,
      entityId,
      adminId,
      scheduledAt,
    },
  });
}

async function notifyAdminScheduledMeetingCompleted({ adminId, entityType, entityId, title, completedByRole }) {
  return notifyAdmin(adminId, {
    eventType: `${entityType}.scheduled.completed`,
    triggerKey: 'moved',
    entityType,
    entityId,
    title: 'Scheduled Meeting Completed',
    body: `${title || entityId} has been completed${completedByRole ? ` by ${completedByRole}` : ''}.`,
    metadata: {
      entityType,
      entityId,
      adminId,
      completedByRole: completedByRole || null,
    },
  });
}

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notifyCitizenMeetingStatusUpdate,
  notifyCitizenComplaintStatusUpdate,
  notifyAdmin,
  notifyActiveAdmins,
  notifyActiveMasterAdmins,
  notifyMasterAdminAccountCreated,
  notifyMasterAdminAccountVerified,
  notifyMasterAdminSecurityAlert,
  notifyDeoVerificationAssigned,
  notifyAdminMeetingVerified,
  notifyAdminPoolMeetingSubmitted,
  notifyAdminPoolComplaintSubmitted,
  notifyAdminComplaintEscalatedToPool,
  notifyAdminComplaintReassigned,
  notifyMinisterMeetingScheduled,
  notifyMinisterMeetingChanged,
  notifyAdminScheduledMeetingUpcoming,
  notifyAdminScheduledMeetingCompleted,
};
