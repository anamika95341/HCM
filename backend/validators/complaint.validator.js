const { z } = require('zod');

const complaintStatusUpdateSchema = z.object({
  status: z.enum(['in_review', 'resolved', 'rejected', 'escalated']),
  note: z.string().min(3).max(2000),
});

module.exports = { complaintStatusUpdateSchema };
