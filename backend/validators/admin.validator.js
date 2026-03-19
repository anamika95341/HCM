const { z } = require('zod');
const { isValidAadhaar } = require('../utils/aadhaar');

const passwordSchema = z.string().min(12).max(128)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const adminRegistrationSchema = z.object({
  registrationToken: z.string().min(20),
  username: z.string().min(4).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().max(100).optional().or(z.literal('')),
  age: z.number().int().min(1).max(120),
  sex: z.enum(['male', 'female', 'other']),
  designation: z.string().min(2).max(150),
  aadhaarNumber: z.string().regex(/^\d{12}$/).refine(isValidAadhaar, 'Invalid Aadhaar number'),
  phoneNumber: z.string().regex(/^\d{10}$/),
  email: z.string().email(),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const adminLoginSchema = z.object({
  usernameOrEmail: z.string().min(3).max(255),
  password: z.string().min(1).max(128),
});

const twoFactorVerifySchema = z.object({
  loginToken: z.string().min(10),
  otp: z.string().regex(/^\d{6}$/),
});

module.exports = {
  adminRegistrationSchema,
  adminLoginSchema,
  twoFactorVerifySchema,
};
