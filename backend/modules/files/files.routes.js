const express = require('express');
const validateRequest = require('../../middleware/validateRequest');
const { z } = require('zod');
const authenticateAny = require('../../middleware/authenticateAny');
const authorize = require('../../middleware/authorize');
const rateLimiter = require('../../middleware/rateLimiter');
const filesController = require('./files.controller');
const { uploadUrlSchema, confirmUploadSchema, listFilesQuerySchema } = require('../../validators/file.validator');

const router = express.Router();

router.post(
  '/upload-url',
  authenticateAny('citizen', 'deo'),
  authorize('citizen', 'deo'),
  rateLimiter.uploads,
  validateRequest(uploadUrlSchema),
  filesController.createUploadUrl,
);

router.post(
  '/confirm-upload',
  authenticateAny('citizen', 'deo'),
  authorize('citizen', 'deo'),
  rateLimiter.uploads,
  validateRequest(confirmUploadSchema),
  filesController.confirmUpload,
);

router.get(
  '/',
  authenticateAny('admin', 'minister'),
  authorize('admin', 'minister'),
  validateRequest(listFilesQuerySchema, 'query'),
  filesController.listFiles,
);

router.get(
  '/:id/download',
  authenticateAny('admin', 'minister'),
  authorize('admin', 'minister'),
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
  filesController.createDownloadUrl,
);

router.get(
  '/access/:fileId',
  validateRequest(z.object({ fileId: z.string().uuid() }), 'params'),
  filesController.accessSignedFile,
);

module.exports = router;
