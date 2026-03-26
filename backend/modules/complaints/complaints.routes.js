const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const { documentUpload } = require('../../middleware/uploadHandler');
const complaintsController = require('./complaints.controller');
const { complaintSchema } = require('../../validators/citizen.validator');
const {
  assignComplaintSchema,
  complaintCallOutcomeSchema,
  complaintCloseSchema,
  complaintDepartmentSchema,
  complaintEscalateSchema,
  complaintResolveSchema,
  complaintReopenSchema,
  complaintScheduleCallSchema,
  reassignComplaintSchema,
} = require('../../validators/complaint.validator');

const router = express.Router();

router.post('/', authenticate('citizen'), authorize('citizen'), (req, res, next) => documentUpload(req, res, next), validateRequest(complaintSchema), complaintsController.submitComplaint);
router.get('/my', authenticate('citizen'), authorize('citizen'), complaintsController.getCitizenComplaints);
router.get('/my/:complaintId', authenticate('citizen'), authorize('citizen'), complaintsController.getCitizenComplaintDetail);
router.get('/:complaintId/admin-view', authenticate('admin'), authorize('admin'), complaintsController.getAdminComplaintDetail);
router.patch('/:complaintId/assign-self', authenticate('admin'), authorize('admin'), validateRequest(assignComplaintSchema), complaintsController.assignComplaintToSelf);
router.patch('/:complaintId/reassign', authenticate('admin'), authorize('admin'), validateRequest(reassignComplaintSchema), complaintsController.reassignComplaint);
router.patch('/:complaintId/start-review', authenticate('admin'), authorize('admin'), validateRequest(assignComplaintSchema), complaintsController.startComplaintReview);
router.patch('/:complaintId/department', authenticate('admin'), authorize('admin'), validateRequest(complaintDepartmentSchema), complaintsController.updateComplaintDepartment);
router.patch('/:complaintId/schedule-call', authenticate('admin'), authorize('admin'), validateRequest(complaintScheduleCallSchema), complaintsController.scheduleComplaintCall);
router.patch('/:complaintId/log-call', authenticate('admin'), authorize('admin'), validateRequest(complaintCallOutcomeSchema), complaintsController.logComplaintCallOutcome);
router.patch('/:complaintId/resolve', authenticate('admin'), authorize('admin'), validateRequest(complaintResolveSchema), complaintsController.resolveComplaint);
router.patch('/:complaintId/escalate', authenticate('admin'), authorize('admin'), validateRequest(complaintEscalateSchema), complaintsController.escalateComplaintToMeeting);
router.patch('/:complaintId/reopen', authenticate('admin'), authorize('admin'), validateRequest(complaintReopenSchema), complaintsController.reopenComplaint);
router.patch('/:complaintId/close', authenticate('admin'), authorize('admin'), validateRequest(complaintCloseSchema), complaintsController.closeComplaint);

module.exports = router;
