const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const rateLimiter = require('../../middleware/rateLimiter');
const { documentUpload } = require('../../middleware/uploadHandler');
const parseMultipartFields = require('../../middleware/parseMultipartFields');
const meetingsController = require('./meetings.controller');
const { meetingRequestSchema } = require('../../validators/citizen.validator');
const { assignVerificationSchema, meetingRejectSchema, meetingVerificationSchema, meetingScheduleSchema } = require('../../validators/meeting.validator');

const router = express.Router();

router.post('/request', authenticate('citizen'), authorize('citizen'), rateLimiter.uploads, (req, res, next) => documentUpload(req, res, next), parseMultipartFields(['additionalAttendees']), validateRequest(meetingRequestSchema), meetingsController.submitMeetingRequest);
router.get('/my', authenticate('citizen'), authorize('citizen'), meetingsController.getCitizenMeetings);
router.get('/my/:meetingId', authenticate('citizen'), authorize('citizen'), meetingsController.getCitizenMeetingDetail);

router.patch('/:meetingId/accept', authenticate('admin'), authorize('admin'), meetingsController.acceptMeeting);
router.patch('/:meetingId/reject', authenticate('admin'), authorize('admin'), validateRequest(meetingRejectSchema), meetingsController.rejectMeeting);
router.patch('/:meetingId/assign-verification', authenticate('admin'), authorize('admin'), validateRequest(assignVerificationSchema), meetingsController.assignVerification);
router.patch('/:meetingId/verify', authenticate('deo'), authorize('deo'), validateRequest(meetingVerificationSchema), meetingsController.submitVerification);
router.patch('/:meetingId/schedule', authenticate('admin'), authorize('admin'), validateRequest(meetingScheduleSchema), meetingsController.scheduleMeeting);

module.exports = router;
