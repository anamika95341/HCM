const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const deoController = require('./deo.controller');
const notificationsController = require('../notifications/notifications.controller');
const settingsController = require('../settings/settings.controller');
const { profileUpdateSchema } = require('../../validators/settings.validator');
const { deoGrievanceUpload } = require('../../middleware/uploadHandler');

const router = express.Router();

router.use(authenticate('deo'));
router.use(authorize('deo'));

router.get('/me', settingsController.getProfile);
router.patch('/me', validateRequest(profileUpdateSchema), settingsController.updateProfile);
router.get('/me/notifications', notificationsController.getPreferences);
router.patch('/me/notifications', notificationsController.updatePreferences);
router.get('/notifications', notificationsController.listNotifications);
router.post('/notifications/read-all', notificationsController.markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', notificationsController.markNotificationRead);
router.get('/assigned-appointments', deoController.getAssignedAppointments);
router.get('/appointments/:appointmentId', validateRequest(z.object({ appointmentId: z.string().uuid() }), 'params'), deoController.getAppointmentDetailForDeo);
router.get('/completed-appointments', deoController.getCompletedAppointments);
router.get('/ministers', deoController.listMinisters);
router.get('/calendar-events', deoController.getCalendarEvents);
router.get('/grievances', deoController.getGrievancesForDeo);
router.get('/grievances/:grievanceId', validateRequest(z.object({ grievanceId: z.string().uuid() }), 'params'), deoController.getGrievanceDetailForDeo);
router.post('/grievances', (req, res, next) => deoGrievanceUpload(req, res, next), deoController.submitGrievanceForCitizen);
router.post(
  '/calendar-events',
  validateRequest(
    z.object({
      ministerId: z.string().uuid(),
      title: z.string().trim().min(3).max(255),
      whoToMeet: z.string().trim().min(1).max(255),
      startsAt: z.string().datetime({ offset: true }),
      endsAt: z.string().datetime({ offset: true }),
      location: z.string().trim().min(3).max(500),
      description: z.string().trim().min(3).max(2000),
    })
  ),
  deoController.createCalendarEvent
);

module.exports = router;
