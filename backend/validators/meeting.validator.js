const { z } = require('zod');

const assignVerificationSchema = z.object({
  deoId: z.string().uuid(),
});

const meetingRejectSchema = z.object({
  reason: z.string().min(5).max(2000),
});

const meetingVerificationSchema = z.object({
  verified: z.boolean(),
  reason: z.string().min(5).max(2000),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

const meetingScheduleSchema = z.object({
  ministerId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().min(3).max(500),
  isVip: z.boolean().default(false),
  comments: z.string().max(2000).optional().or(z.literal('')),
}).refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
  message: 'End time must be after start time',
  path: ['endsAt'],
});

const meetingActionNoteSchema = z.object({
  reason: z.string().min(3).max(2000),
});

module.exports = {
  assignVerificationSchema,
  meetingRejectSchema,
  meetingVerificationSchema,
  meetingScheduleSchema,
  meetingActionNoteSchema,
};
