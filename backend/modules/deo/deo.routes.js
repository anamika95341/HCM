const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const deoController = require('./deo.controller');

const router = express.Router();

router.use(authenticate('deo'));
router.use(authorize('deo'));

router.get('/assigned-meetings', deoController.getAssignedMeetings);

module.exports = router;
