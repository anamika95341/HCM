const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const citizenController = require('./citizen.controller');

const router = express.Router();

router.use(authenticate('citizen'));
router.use(authorize('citizen'));

router.get('/me', citizenController.getProfile);
router.get('/dashboard', citizenController.getDashboard);
router.get('/admin-directory', citizenController.getAdminDirectory);
router.get('/my-cases', citizenController.getMyCases);
router.get('/cases/:caseId', citizenController.getCaseDetail);

module.exports = router;
