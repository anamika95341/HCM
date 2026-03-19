const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const ministerController = require('./minister.controller');

const router = express.Router();

router.use(authenticate('minister'));
router.use(authorize('minister'));

router.get('/calendar', ministerController.getCalendar);

module.exports = router;
