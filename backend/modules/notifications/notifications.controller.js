const notificationsService = require('./notifications.service');

async function getPreferences(req, res, next) {
  try {
    const preferences = await notificationsService.getNotificationPreferences(req.authRole, req.user.sub);
    res.json({ preferences });
  } catch (error) {
    next(error);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const preferences = await notificationsService.updateNotificationPreferences(req.authRole, req.user.sub, req.body || {});
    res.json({ preferences, message: 'Preferences saved' });
  } catch (error) {
    next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 20;
    const data = await notificationsService.listNotifications(req.authRole, req.user.sub, { limit });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const result = await notificationsService.markNotificationRead(req.authRole, req.user.sub, req.params.notificationId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await notificationsService.markAllNotificationsRead(req.authRole, req.user.sub);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPreferences,
  updatePreferences,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
