const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const { documentUpload } = require('../../middleware/uploadHandler');
const complaintsController = require('./complaints.controller');
const { complaintSchema } = require('../../validators/citizen.validator');
const { complaintStatusUpdateSchema } = require('../../validators/complaint.validator');

const router = express.Router();

router.post('/', authenticate('citizen'), authorize('citizen'), (req, res, next) => documentUpload(req, res, next), validateRequest(complaintSchema), complaintsController.submitComplaint);
router.get('/my', authenticate('citizen'), authorize('citizen'), complaintsController.getCitizenComplaints);
router.get('/my/:complaintId', authenticate('citizen'), authorize('citizen'), complaintsController.getCitizenComplaintDetail);
router.patch('/:complaintId/status', authenticate('admin'), authorize('admin'), validateRequest(complaintStatusUpdateSchema), complaintsController.updateComplaintStatus);

module.exports = router;
