const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validateRequest = require('../../middleware/validateRequest');
const rateLimiter = require('../../middleware/rateLimiter');
const authController = require('./auth.controller');
const { citizenRegistrationSchema, citizenLoginSchema, citizenForgotPasswordSchema, citizenResetPasswordSchema } = require('../../validators/citizen.validator');
const { adminRegistrationSchema, adminLoginSchema, twoFactorVerifySchema } = require('../../validators/admin.validator');
const { z } = require('zod');

const router = express.Router();

router.post('/citizen/register', rateLimiter.auth, validateRequest(citizenRegistrationSchema), authController.citizenRegister);
router.post('/citizen/verify-account', rateLimiter.auth, validateRequest(z.object({ userId: z.string().uuid(), otp: z.string().regex(/^\d{6}$/) })), authController.citizenVerify);
router.post('/citizen/login', rateLimiter.auth, validateRequest(citizenLoginSchema), authController.citizenLogin);
router.post('/citizen/forgot-password', rateLimiter.auth, validateRequest(citizenForgotPasswordSchema), authController.forgotCitizenPassword);
router.post('/citizen/reset-password', rateLimiter.auth, validateRequest(citizenResetPasswordSchema), authController.resetCitizenPassword);

router.post('/admin/verify-registration-token', rateLimiter.auth, validateRequest(z.object({ registrationToken: z.string().min(20) })), authController.adminVerifyRegistrationToken);
router.post('/admin/register', rateLimiter.auth, validateRequest(adminRegistrationSchema), authController.adminRegister);
router.post('/admin/login', rateLimiter.auth, validateRequest(adminLoginSchema), authController.adminLogin);
router.post('/admin/verify-otp', rateLimiter.auth, validateRequest(twoFactorVerifySchema), authController.verifyOtp);

router.post('/deo/login', rateLimiter.auth, validateRequest(adminLoginSchema), authController.deoLogin);
router.post('/deo/verify-otp', rateLimiter.auth, validateRequest(twoFactorVerifySchema), authController.verifyOtp);

router.post('/minister/login', rateLimiter.auth, validateRequest(adminLoginSchema), authController.ministerLogin);

router.post('/token/refresh', rateLimiter.auth, validateRequest(z.object({ refreshToken: z.string().min(20) })), authController.refresh);
router.post('/citizen/logout', authenticate('citizen'), authController.logout);
router.post('/admin/logout', authenticate('admin'), authController.logout);
router.post('/deo/logout', authenticate('deo'), authController.logout);
router.post('/minister/logout', authenticate('minister'), authController.logout);

module.exports = router;
