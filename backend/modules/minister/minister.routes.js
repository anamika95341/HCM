const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const ministerController = require('./minister.controller');

const router = express.Router();

router.use(authenticate('minister'));
router.use(authorize('minister'));

router.get('/calendar', ministerController.getCalendar);
router.get(
  '/calendar/:meetingId/files',
  validateRequest(z.object({ meetingId: z.string().uuid() }), 'params'),
  ministerController.getMeetingFiles
);

module.exports = router;
