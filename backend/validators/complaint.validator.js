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
  reason: z.string().min(3).max(2000),
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

const complaintCallOutcomeSchema = z.object({
  callOutcome: z.string().min(5).max(3000),
});

const complaintResolveSchema = z.object({
  resolutionSummary: z.string().min(10).max(5000),
  resolutionDocs: z.array(z.object({
    name: z.string().min(1).max(255),
  })).max(10).default([]),
});

const complaintEscalateSchema = z.object({
  purpose: z.string().min(10).max(3000),
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
  complaintCallOutcomeSchema,
  complaintResolveSchema,
  complaintEscalateSchema,
  complaintReopenSchema,
  complaintCloseSchema,
};
