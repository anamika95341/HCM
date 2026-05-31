const { z } = require('zod');

const grievanceStatusUpdateSchema = z.object({
  status: z.enum([
    'submitted',
    'assigned',
    'in_review',
    'department_contact_identified',
    'call_scheduled',
    'followup_in_progress',
    'resolved',
    'rejected',
    'completed',
  ]),
  note: z.string().min(3).max(2000),
});

const assignGrievanceSchema = z.object({});

const grievanceDepartmentSchema = z.object({
  department: z.string().min(2).max(150),
  officerName: z.string().max(150).optional().or(z.literal('')),
  officerContact: z.string().max(255).optional().or(z.literal('')),
  manualContact: z.string().max(255).optional().or(z.literal('')),
});

const grievanceScheduleCallSchema = z.object({
  callScheduledAt: z.string().datetime(),
});

const grievanceLogSchema = z.object({
  logTypes: z.array(z.enum(['phone_call', 'mail', 'letter_summary', 'appointment'])).min(1).max(4),
  summary: z.string().trim().max(3000).optional().or(z.literal('')),
});

const grievanceResolveSchema = z.object({
  resolutionSummary: z.string().trim().min(10).refine((value) => {
    const wordCount = value.split(/\s+/).filter(Boolean).length;
    return wordCount <= 1000;
  }, 'Resolution summary must be 1000 words or less'),
  resolutionDocs: z.array(z.object({
    name: z.string().min(1).max(255),
  })).max(10).default([]),
});

const grievanceReopenSchema = z.object({
  reason: z.string().min(3).max(2000),
});

const grievanceCloseSchema = z.object({
  note: z.string().min(3).max(2000),
});

module.exports = {
  grievanceStatusUpdateSchema,
  assignGrievanceSchema,
  grievanceDepartmentSchema,
  grievanceScheduleCallSchema,
  grievanceLogSchema,
  grievanceResolveSchema,
  grievanceReopenSchema,
  grievanceCloseSchema,
};
