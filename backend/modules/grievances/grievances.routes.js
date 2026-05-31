const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const { documentUpload, deoLetterheadMultiUpload } = require('../../middleware/uploadHandler');
const grievancesController = require('./grievances.controller');
const { grievanceSchema } = require('../../validators/citizen.validator');
const {
  assignGrievanceSchema,
  grievanceCloseSchema,
  grievanceDepartmentSchema,
  grievanceLogSchema,
  grievanceResolveSchema,
  grievanceReopenSchema,
  grievanceScheduleCallSchema,
} = require('../../validators/grievance.validator');
const { z } = require('zod');

const router = express.Router();

// Citizen routes
router.post('/', authenticate('citizen'), authorize('citizen'), (req, res, next) => documentUpload(req, res, next), validateRequest(grievanceSchema), grievancesController.submitGrievance);
router.get('/my', authenticate('citizen'), authorize('citizen'), grievancesController.getCitizenGrievances);
router.get('/my/:grievanceId', authenticate('citizen'), authorize('citizen'), grievancesController.getCitizenGrievanceDetail);

// CM Admin only: list all grievances (My Grievances view)
router.get('/cm-admin/all', authenticate('admin'), authorize('admin'), (req, res, next) => {
  if (req.user?.adminType !== 'chief_minister') {
    return res.status(403).json({ error: 'Forbidden: Chief Minister admin only' });
  }
  return next();
}, grievancesController.getCmAdminGrievances);

// DEO letterhead generation (multipart: office text field + document file)
router.patch('/:grievanceId/deo-letterhead', authenticate('deo'), authorize('deo'),
  (req, res, next) => deoLetterheadMultiUpload(req, res, next),
  grievancesController.generateDeoLetterhead
);

// Admin (CM admin) grievance detail and workflow
router.get('/:grievanceId/admin-view', authenticate('admin'), authorize('admin'), grievancesController.getAdminGrievanceDetail);
router.patch('/:grievanceId/assign-self', authenticate('admin'), authorize('admin'), validateRequest(assignGrievanceSchema), grievancesController.assignGrievanceToSelf);
router.patch('/:grievanceId/start-review', authenticate('admin'), authorize('admin'), validateRequest(assignGrievanceSchema), grievancesController.startGrievanceReview);
router.patch('/:grievanceId/department', authenticate('admin'), authorize('admin'), validateRequest(grievanceDepartmentSchema), grievancesController.updateGrievanceDepartment);
router.patch('/:grievanceId/schedule-call', authenticate('admin'), authorize('admin'), validateRequest(grievanceScheduleCallSchema), grievancesController.scheduleGrievanceCall);
router.patch('/:grievanceId/log', authenticate('admin'), authorize('admin'), validateRequest(grievanceLogSchema), grievancesController.logGrievanceAction);
router.patch('/:grievanceId/resolve', authenticate('admin'), authorize('admin'), validateRequest(grievanceResolveSchema), grievancesController.resolveGrievance);
router.patch('/:grievanceId/reopen', authenticate('admin'), authorize('admin'), validateRequest(grievanceReopenSchema), grievancesController.reopenGrievance);
router.patch('/:grievanceId/close', authenticate('admin'), authorize('admin'), validateRequest(grievanceCloseSchema), grievancesController.closeGrievance);

module.exports = router;
