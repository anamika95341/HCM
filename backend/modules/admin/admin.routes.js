const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const adminController = require('./admin.controller');

const router = express.Router();

router.use(authenticate('admin'));
router.use(authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/work-queue', adminController.getWorkQueue);
router.get('/workflow-directory', adminController.getWorkflowDirectory);
router.get('/deos', adminController.listDeos);

module.exports = router;
