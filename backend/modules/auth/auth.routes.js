const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validateRequest = require('../../middleware/validateRequest');
const rateLimiter = require('../../middleware/rateLimiter');
const authController = require('./auth.controller');
const { citizenRegistrationSchema, citizenLoginSchema, citizenForgotPasswordSchema, citizenResetPasswordSchema } = require('../../validators/citizen.validator');
const { adminLoginSchema, adminVerificationStartSchema, adminVerificationCompleteSchema, deoVerificationStartSchema, deoVerificationCompleteSchema } = require('../../validators/admin.validator');
const { z } = require('zod');

const router = express.Router();

router.post('/citizen/register', rateLimiter.auth, validateRequest(citizenRegistrationSchema), authController.citizenRegister);
router.post('/citizen/verify-account', rateLimiter.auth, validateRequest(z.object({ userId: z.string().uuid(), otp: z.string().regex(/^\d{6}$/) })), authController.citizenVerify);
router.post('/citizen/login', rateLimiter.auth, validateRequest(citizenLoginSchema), authController.citizenLogin);
router.post('/citizen/forgot-password', rateLimiter.auth, validateRequest(citizenForgotPasswordSchema), authController.forgotCitizenPassword);
router.post('/citizen/reset-password', rateLimiter.auth, validateRequest(citizenResetPasswordSchema), authController.resetCitizenPassword);

router.post('/admin/login', rateLimiter.auth, validateRequest(adminLoginSchema), authController.adminLogin);
router.post('/admin/verify-account', rateLimiter.auth, validateRequest(adminVerificationCompleteSchema), authController.adminVerify);
router.post('/admin/resend-verification-code', rateLimiter.auth, validateRequest(adminVerificationStartSchema), authController.adminResendVerification);

router.post('/masteradmin/login', rateLimiter.auth, validateRequest(adminLoginSchema), authController.masteradminLogin);

router.post('/deo/login', rateLimiter.auth, validateRequest(adminLoginSchema), authController.deoLogin);
router.post('/deo/verify-account', rateLimiter.auth, validateRequest(deoVerificationCompleteSchema), authController.deoVerify);
router.post('/deo/resend-verification-code', rateLimiter.auth, validateRequest(deoVerificationStartSchema), authController.deoResendVerification);

router.post('/minister/login', rateLimiter.auth, validateRequest(adminLoginSchema), authController.ministerLogin);

router.post('/token/refresh', rateLimiter.auth, validateRequest(z.object({ refreshToken: z.string().min(20) })), authController.refresh);
router.post('/citizen/logout', authenticate('citizen'), authController.logout);
router.post('/admin/logout', authenticate('admin'), authController.logout);
router.post('/masteradmin/logout', authenticate('masteradmin'), authController.logout);
router.post('/deo/logout', authenticate('deo'), authController.logout);
router.post('/minister/logout', authenticate('minister'), authController.logout);

module.exports = router;
