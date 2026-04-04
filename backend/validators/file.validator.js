const { z } = require('zod');
const { CONTEXT_TYPES, FILE_CATEGORY_BY_MIME } = require('../modules/files/files.policy');

const supportedMimeTypes = Object.keys(FILE_CATEGORY_BY_MIME);

const uploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().refine((value) => supportedMimeTypes.includes(value), 'Unsupported MIME type'),
  size: z.number().int().positive().max(100 * 1024 * 1024),
  contextType: z.enum(CONTEXT_TYPES).default('general'),
  contextId: z.string().uuid().optional().nullable(),
});

const confirmUploadSchema = z.object({
  s3Key: z.string().trim().min(3).max(1024),
});

const listFilesQuerySchema = z.object({
  contextType: z.enum(CONTEXT_TYPES).optional(),
  contextId: z.string().uuid().optional(),
  status: z.enum(['pending', 'reviewed', 'approved']).optional(),
});

module.exports = {
  uploadUrlSchema,
  confirmUploadSchema,
  listFilesQuerySchema,
};
