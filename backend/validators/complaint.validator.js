const { z } = require('zod');

const complaintStatusUpdateSchema = z.object({
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
    'escalated_to_meeting',
  ]),
  note: z.string().min(3).max(2000),
});

const assignComplaintSchema = z.object({});

const reassignComplaintSchema = z.object({
  adminId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().or(z.literal('')),
});

const complaintDepartmentSchema = z.object({
  department: z.string().min(2).max(150),
  officerName: z.string().max(150).optional().or(z.literal('')),
  officerContact: z.string().max(255).optional().or(z.literal('')),
  manualContact: z.string().max(255).optional().or(z.literal('')),
});

const complaintScheduleCallSchema = z.object({
  callScheduledAt: z.string().datetime(),
});

const complaintLogSchema = z.object({
  logTypes: z.array(z.enum(['phone_call', 'mail', 'letter_summary', 'meeting'])).min(1).max(4),
  summary: z.string().trim().max(3000).optional().or(z.literal('')),
});

const complaintResolveSchema = z.object({
  resolutionSummary: z.string().trim().min(10).refine((value) => {
    const wordCount = value.split(/\s+/).filter(Boolean).length;
    return wordCount <= 1000;
  }, 'Resolution summary must be 1000 words or less'),
  resolutionDocs: z.array(z.object({
    name: z.string().min(1).max(255),
  })).max(10).default([]),
});

const complaintEscalateSchema = z.object({
  reason: z.string().trim().min(4).max(500),
});

const complaintReopenSchema = z.object({
  reason: z.string().min(3).max(2000),
});

const complaintCloseSchema = z.object({
  note: z.string().min(3).max(2000),
});

module.exports = {
  complaintStatusUpdateSchema,
  assignComplaintSchema,
  reassignComplaintSchema,
  complaintDepartmentSchema,
  complaintScheduleCallSchema,
  complaintLogSchema,
  complaintResolveSchema,
  complaintEscalateSchema,
  complaintReopenSchema,
  complaintCloseSchema,
};
