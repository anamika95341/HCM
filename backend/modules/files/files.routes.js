const express = require('express');
const validateRequest = require('../../middleware/validateRequest');
const { z } = require('zod');
const filesController = require('./files.controller');

const router = express.Router();

router.get(
  '/access/:fileId',
  validateRequest(z.object({ fileId: z.string().uuid() }), 'params'),
  filesController.accessSignedFile,
);

module.exports = router;
