const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const adminController = require('./admin.controller');
const notificationsController = require('../notifications/notifications.controller');
const settingsController = require('../settings/settings.controller');
const { profileUpdateSchema } = require('../../validators/settings.validator');

const router = express.Router();

router.use(authenticate('admin'));
router.use(authorize('admin'));

router.get('/me', settingsController.getProfile);
router.patch('/me', validateRequest(profileUpdateSchema), settingsController.updateProfile);
router.get('/me/notifications', notificationsController.getPreferences);
router.patch('/me/notifications', notificationsController.updatePreferences);
router.get('/notifications', notificationsController.listNotifications);
router.post('/notifications/read-all', notificationsController.markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', notificationsController.markNotificationRead);
router.get('/dashboard', adminController.getDashboard);
router.get('/work-queue', adminController.getWorkQueue);
router.get('/workflow-directory', adminController.getWorkflowDirectory);
router.get('/deos', adminController.listDeos);
router.get('/calendar', adminController.getCalendar);

module.exports = router;
