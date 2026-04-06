const { z } = require('zod');

const passwordSchema = z.string().min(12).max(128)
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[0-9]/, 'Must include a number')
  .regex(/[^A-Za-z0-9]/, 'Must include a special character');

const optionalTrimmedString = (schema) => z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}, schema.optional());

const profileUpdateSchema = z.object({
  name: optionalTrimmedString(z.string().min(1).max(200)),
  contact: optionalTrimmedString(z.string().regex(/^\d{10}$/)),
  email: optionalTrimmedString(z.string().email().max(255)),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
  confirmPassword: z.string().max(128).optional(),
}).superRefine((data, ctx) => {
  if (data.confirmPassword !== undefined && data.confirmPassword !== data.newPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }
  if (data.currentPassword === data.newPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['newPassword'],
      message: 'New password must be different from the current password',
    });
  }
});

module.exports = {
  profileUpdateSchema,
  changePasswordSchema,
};
