const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const ministerController = require('./minister.controller');
const notificationsController = require('../notifications/notifications.controller');
const settingsController = require('../settings/settings.controller');
const { profileUpdateSchema } = require('../../validators/settings.validator');

const router = express.Router();

router.use(authenticate('minister'));
router.use(authorize('minister'));

router.get('/me', settingsController.getProfile);
router.patch('/me', validateRequest(profileUpdateSchema), settingsController.updateProfile);
router.get('/me/notifications', notificationsController.getPreferences);
router.patch('/me/notifications', notificationsController.updatePreferences);
router.get('/notifications', notificationsController.listNotifications);
router.post('/notifications/read-all', notificationsController.markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', notificationsController.markNotificationRead);
router.get('/calendar', ministerController.getCalendar);
router.get(
  '/calendar/:meetingId/files',
  validateRequest(z.object({ meetingId: z.string().uuid() }), 'params'),
  ministerController.getMeetingFiles
);

module.exports = router;
