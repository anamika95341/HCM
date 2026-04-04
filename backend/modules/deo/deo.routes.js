const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const deoController = require('./deo.controller');

const router = express.Router();

router.use(authenticate('deo'));
router.use(authorize('deo'));

router.get('/assigned-meetings', deoController.getAssignedMeetings);
router.get('/completed-meetings', deoController.getCompletedMeetings);
router.get('/ministers', deoController.listMinisters);
router.get('/calendar-events', deoController.getCalendarEvents);
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
