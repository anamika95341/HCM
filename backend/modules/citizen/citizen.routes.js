const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const citizenController = require('./citizen.controller');
const notificationsController = require('../notifications/notifications.controller');
const settingsController = require('../settings/settings.controller');
const { profileUpdateSchema } = require('../../validators/settings.validator');

const router = express.Router();

router.use(authenticate('citizen'));
router.use(authorize('citizen'));

router.get('/me', citizenController.getProfile);
router.patch('/me', validateRequest(profileUpdateSchema), settingsController.updateProfile);
router.get('/me/notifications', notificationsController.getPreferences);
router.patch('/me/notifications', notificationsController.updatePreferences);
router.get('/dashboard', citizenController.getDashboard);
router.get('/admin-directory', citizenController.getAdminDirectory);
router.get('/notifications', notificationsController.listNotifications);
router.post('/notifications/read-all', notificationsController.markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', notificationsController.markNotificationRead);
router.get('/my-cases', citizenController.getMyCases);
router.get('/cases/:caseId', citizenController.getCaseDetail);

module.exports = router;
