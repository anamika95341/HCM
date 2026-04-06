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

  if (recipientRole === 'citizen' && preferences.channels.app) {
    const unreadCount = await notificationsRepository.countUnreadNotifications({
      recipientRole,
      recipientId,
    });
    await publishNotificationCreated({
      citizenId: recipientId,
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

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notifyCitizenMeetingStatusUpdate,
  notifyCitizenComplaintStatusUpdate,
};
