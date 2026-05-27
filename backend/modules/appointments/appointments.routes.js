const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const rateLimiter = require('../../middleware/rateLimiter');
const { documentUpload, photoUpload } = require('../../middleware/uploadHandler');
const parseMultipartFields = require('../../middleware/parseMultipartFields');
const appointmentsController = require('./appointments.controller');
const { appointmentRequestSchema } = require('../../validators/citizen.validator');
const { assignAppointmentSchema, assignVerificationSchema, appointmentRejectSchema, appointmentVerificationSchema, appointmentScheduleSchema, appointmentActionNoteSchema, appointmentLogSchema } = require('../../validators/appointment.validator');

const router = express.Router();

router.post('/request', authenticate('citizen'), authorize('citizen'), rateLimiter.uploads, (req, res, next) => documentUpload(req, res, next), parseMultipartFields(['additionalAttendees']), validateRequest(appointmentRequestSchema), appointmentsController.submitAppointmentRequest);
router.get('/my', authenticate('citizen'), authorize('citizen'), appointmentsController.getCitizenAppointments);
router.get('/my/:appointmentId', authenticate('citizen'), authorize('citizen'), appointmentsController.getCitizenAppointmentDetail);
router.get('/:appointmentId/admin-view', authenticate('admin'), authorize('admin'), appointmentsController.getAdminAppointmentDetail);
router.get('/:appointmentId/files', authenticate('admin'), authorize('admin'), appointmentsController.getAdminAppointmentFiles);

router.patch('/:appointmentId/assign-self', authenticate('admin'), authorize('admin'), validateRequest(assignAppointmentSchema), appointmentsController.assignAppointmentToSelf);
router.patch('/:appointmentId/accept', authenticate('admin'), authorize('admin'), appointmentsController.acceptAppointment);
router.patch('/:appointmentId/reject', authenticate('admin'), authorize('admin'), validateRequest(appointmentRejectSchema), appointmentsController.rejectAppointment);
router.patch('/:appointmentId/assign-verification', authenticate('admin'), authorize('admin'), validateRequest(assignVerificationSchema), appointmentsController.assignVerification);
router.patch('/:appointmentId/verify', authenticate('deo'), authorize('deo'), validateRequest(appointmentVerificationSchema), appointmentsController.submitVerification);
router.patch('/:appointmentId/schedule', authenticate('admin'), authorize('admin'), validateRequest(appointmentScheduleSchema), appointmentsController.scheduleAppointment);
router.post('/:appointmentId/photos', authenticate('admin'), authorize('admin'), rateLimiter.uploads, (req, res, next) => photoUpload(req, res, next), appointmentsController.uploadAppointmentPhoto);
router.patch('/:appointmentId/complete', authenticate('admin'), authorize('admin'), validateRequest(appointmentActionNoteSchema), appointmentsController.completeAppointment);
router.patch('/:appointmentId/cancel', authenticate('admin'), authorize('admin'), validateRequest(appointmentActionNoteSchema), appointmentsController.cancelAppointment);
router.patch('/:appointmentId/log', authenticate('admin'), authorize('admin'), validateRequest(appointmentLogSchema), appointmentsController.addMeetingLog);

module.exports = router;
