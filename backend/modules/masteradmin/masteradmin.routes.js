const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const masteradminController = require('./masteradmin.controller');
const { adminCreationSchema, deoCreationSchema } = require('../../validators/admin.validator');

const router = express.Router();

router.use(authenticate('masteradmin'));
router.use(authorize('masteradmin'));

router.get('/dashboard', masteradminController.getDashboard);
router.get('/admins', masteradminController.listAdmins);
router.post('/admins', validateRequest(adminCreationSchema), masteradminController.createAdmin);
router.delete('/admins/:adminId', validateRequest(z.object({ adminId: z.string().uuid() }), 'params'), masteradminController.removeAdmin);
router.get('/deos', masteradminController.listDeos);
router.post('/deos', validateRequest(deoCreationSchema), masteradminController.createDeo);
router.delete('/deos/:deoId', validateRequest(z.object({ deoId: z.string().uuid() }), 'params'), masteradminController.removeDeo);

module.exports = router;
