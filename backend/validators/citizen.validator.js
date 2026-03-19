const { z } = require('zod');
const { isValidAadhaar } = require('../utils/aadhaar');

const passwordSchema = z.string().min(12).max(128)
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[0-9]/, 'Must include a number')
  .regex(/[^A-Za-z0-9]/, 'Must include a special character');

const attendeeSchema = z.object({
  attendeeName: z.string().min(2).max(150),
  attendeePhone: z.string().regex(/^\d{10}$/),
});

const citizenRegistrationSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  aadhaarNumber: z.string().regex(/^\d{12}$/).refine(isValidAadhaar, 'Invalid Aadhaar number'),
  age: z.number().int().min(1).max(120),
  sex: z.enum(['male', 'female', 'other']),
  mobileNumber: z.string().regex(/^\d{10}$/),
  pincode: z.string().regex(/^\d{6}$/),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  password: passwordSchema,
  confirmPassword: z.string(),
  preferredVerificationChannel: z.enum(['email', 'sms']).default('sms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const citizenLoginSchema = z.object({
  citizenId: z.string().min(5).max(32),
  password: z.string().min(1).max(128),
});

const citizenForgotPasswordSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/).refine(isValidAadhaar, 'Invalid Aadhaar number'),
  email: z.string().email().optional().or(z.literal('')),
  captchaToken: z.string().min(10),
});

const citizenResetPasswordSchema = z.object({
  citizenId: z.string().min(5).max(32),
  otp: z.string().regex(/^\d{6}$/),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const complaintSchema = z.object({
  subject: z.string().min(5).max(255),
  description: z.string().min(10).max(5000),
});

const meetingRequestSchema = z.object({
  title: z.string().min(5).max(255),
  purpose: z.string().min(10).max(3000),
  preferredTime: z.string().datetime().optional().or(z.literal('')),
  adminReferral: z.string().max(255).optional().or(z.literal('')),
  additionalAttendees: z.array(attendeeSchema).max(5).default([]),
});

module.exports = {
  citizenRegistrationSchema,
  citizenLoginSchema,
  citizenForgotPasswordSchema,
  citizenResetPasswordSchema,
  complaintSchema,
  meetingRequestSchema,
};
