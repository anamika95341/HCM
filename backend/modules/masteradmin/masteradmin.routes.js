const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const masteradminController = require('./masteradmin.controller');
const notificationsController = require('../notifications/notifications.controller');
const settingsController = require('../settings/settings.controller');
const { adminCreationSchema, deoCreationSchema } = require('../../validators/admin.validator');
const { profileUpdateSchema } = require('../../validators/settings.validator');

const router = express.Router();

router.use(authenticate('masteradmin'));
router.use(authorize('masteradmin'));

router.get('/me', settingsController.getProfile);
router.patch('/me', validateRequest(profileUpdateSchema), settingsController.updateProfile);
router.get('/me/notifications', notificationsController.getPreferences);
router.patch('/me/notifications', notificationsController.updatePreferences);
router.get('/notifications', notificationsController.listNotifications);
router.post('/notifications/read-all', notificationsController.markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', notificationsController.markNotificationRead);
router.get('/dashboard', masteradminController.getDashboard);
router.get('/admins', masteradminController.listAdmins);
router.post('/admins', validateRequest(adminCreationSchema), masteradminController.createAdmin);
router.delete('/admins/:adminId', validateRequest(z.object({ adminId: z.string().uuid() }), 'params'), masteradminController.removeAdmin);
router.get('/deos', masteradminController.listDeos);
router.post('/deos', validateRequest(deoCreationSchema), masteradminController.createDeo);
router.delete('/deos/:deoId', validateRequest(z.object({ deoId: z.string().uuid() }), 'params'), masteradminController.removeDeo);

module.exports = router;
