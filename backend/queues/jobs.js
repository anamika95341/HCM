'use strict';

/**
 * Job Contract Module - Defines job names, payload schemas, and utilities
 * This is a pure contract/utility module with zero dependencies.
 * It serves as the contract layer between job producers (services) and workers.
 */

/**
 * Job name constants
 * Ensure consistency across all job producers and workers
 */
const JOBS = {
  SEND_EMAIL: 'sendEmail',
  SEND_SMS: 'sendSms',
  // NOTE: SEND_EMAIL_BATCH — worker processor not yet implemented.
  // Jobs enqueued with this name will queue but not be consumed until
  // jobRunner.js adds a 'sendEmailBatch' worker. See Task 3.
  SEND_EMAIL_BATCH: 'sendEmailBatch',
};

/**
 * Payload Schemas (documented for reference)
 *
 * sendEmail payload:
 *   Required:
 *     - to (string): Email address, must contain '@'
 *     - subject (string): Non-empty subject line
 *     - text (string): Non-empty plain text body
 *   Optional:
 *     - html (string): HTML body
 *     - correlationId (string): Unique ID for correlating related operations
 *     - context (object): { entityType, entityId, userId, role }
 *
 * sendSms payload:
 *   Required:
 *     - to (string): Non-empty phone number or identifier
 *     - message (string): Non-empty message, max 1600 characters
 *   Optional:
 *     - correlationId (string): Unique ID for correlating related operations
 *     - context (object): { entityType, entityId, userId, role }
 *
 * sendEmailBatch payload:
 *   Required:
 *     - recipients (array): Non-empty array of { to, subject, text }, max 500 entries
 *       Each recipient must have:
 *       - to (string): Email address, must contain '@'
 *       - subject (string): Non-empty subject line
 *       - text (string): Non-empty plain text body
 *   Optional:
 *     - correlationId (string): Unique ID for correlating related operations
 *     - context (object): { eventType, entityType, entityId }
 *   Note: Recipients must be deduplicated by 'to' before processing in worker
 */

/**
 * Validates job payload based on job name
 * Throws TypeError with descriptive message if validation fails
 *
 * @param {string} name - Job name from JOBS constant
 * @param {object} data - Payload to validate
 * @throws {TypeError} If payload is invalid
 */
function validateJobPayload(name, data) {
  if (!name || typeof name !== 'string') {
    throw new TypeError('Job name must be a non-empty string');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Job payload must be a non-null object');
  }

  switch (name) {
    case JOBS.SEND_EMAIL:
      validateSendEmailPayload(data);
      break;

    case JOBS.SEND_SMS:
      validateSendSmsPayload(data);
      break;

    case JOBS.SEND_EMAIL_BATCH:
      validateSendEmailBatchPayload(data);
      break;

    default:
      throw new TypeError(`Unknown job name: ${name}`);
  }
}

/**
 * Validates sendEmail payload
 * @private
 */
function validateSendEmailPayload(data) {
  // Validate required fields
  if (typeof data.to !== 'string') {
    throw new TypeError('sendEmail: "to" must be a valid email address (local@domain)');
  }
  const atIndex = data.to.trim().indexOf('@');
  if (atIndex < 1 || atIndex === data.to.trim().length - 1) {
    throw new TypeError('sendEmail: "to" must be a valid email address (local@domain)');
  }

  if (typeof data.subject !== 'string' || data.subject.trim() === '') {
    throw new TypeError('sendEmail: "subject" must be a non-empty string');
  }

  if (typeof data.text !== 'string' || data.text.trim() === '') {
    throw new TypeError('sendEmail: "text" must be a non-empty string');
  }

  // Validate optional fields
  if (data.html !== undefined && typeof data.html !== 'string') {
    throw new TypeError('sendEmail: "html" must be a string if provided');
  }

  if (data.correlationId !== undefined && (typeof data.correlationId !== 'string' || data.correlationId.trim() === '')) {
    throw new TypeError('sendEmail: "correlationId" must be a non-empty string if provided');
  }

  if (data.context !== undefined) {
    if (typeof data.context !== 'object' || Array.isArray(data.context) || data.context === null) {
      throw new TypeError('sendEmail: "context" must be an object if provided');
    }
  }
}

/**
 * Validates sendSms payload
 * @private
 */
function validateSendSmsPayload(data) {
  // Validate required fields
  if (typeof data.to !== 'string' || data.to.trim() === '') {
    throw new TypeError('sendSms: "to" must be a non-empty string');
  }

  if (typeof data.message !== 'string' || data.message.trim() === '') {
    throw new TypeError('sendSms: "message" must be a non-empty string');
  }

  if (data.message.length > 1600) {
    throw new TypeError('sendSms: "message" must not exceed 1600 characters');
  }

  // Validate optional fields
  if (data.correlationId !== undefined && (typeof data.correlationId !== 'string' || data.correlationId.trim() === '')) {
    throw new TypeError('sendSms: "correlationId" must be a non-empty string if provided');
  }

  if (data.context !== undefined) {
    if (typeof data.context !== 'object' || Array.isArray(data.context) || data.context === null) {
      throw new TypeError('sendSms: "context" must be an object if provided');
    }
  }
}

/**
 * Validates sendEmailBatch payload
 * NOTE: SEND_EMAIL_BATCH — worker processor not yet implemented.
 * Jobs enqueued with this name will queue but not be consumed until
 * jobRunner.js adds a 'sendEmailBatch' worker. See Task 3.
 * @private
 */
function validateSendEmailBatchPayload(data) {
  // Validate recipients array
  if (!Array.isArray(data.recipients) || data.recipients.length === 0) {
    throw new TypeError('sendEmailBatch: "recipients" must be a non-empty array');
  }

  if (data.recipients.length > 500) {
    throw new TypeError('sendEmailBatch: "recipients" must not exceed 500 entries');
  }

  // Validate each recipient
  data.recipients.forEach((recipient, index) => {
    if (typeof recipient !== 'object' || Array.isArray(recipient) || recipient === null) {
      throw new TypeError(`sendEmailBatch: recipient at index ${index} must be an object`);
    }

    if (typeof recipient.to !== 'string') {
      throw new TypeError(
        `sendEmailBatch: recipient at index ${index} "to" must be a valid email address (local@domain)`
      );
    }
    const atIndex = recipient.to.trim().indexOf('@');
    if (atIndex < 1 || atIndex === recipient.to.trim().length - 1) {
      throw new TypeError(
        `sendEmailBatch: recipient at index ${index} "to" must be a valid email address (local@domain)`
      );
    }

    if (typeof recipient.subject !== 'string' || recipient.subject.trim() === '') {
      throw new TypeError(`sendEmailBatch: recipient at index ${index} "subject" must be a non-empty string`);
    }

    if (typeof recipient.text !== 'string' || recipient.text.trim() === '') {
      throw new TypeError(`sendEmailBatch: recipient at index ${index} "text" must be a non-empty string`);
    }
  });

  // Validate optional fields
  if (data.correlationId !== undefined && (typeof data.correlationId !== 'string' || data.correlationId.trim() === '')) {
    throw new TypeError('sendEmailBatch: "correlationId" must be a non-empty string if provided');
  }

  if (data.context !== undefined) {
    if (typeof data.context !== 'object' || Array.isArray(data.context) || data.context === null) {
      throw new TypeError('sendEmailBatch: "context" must be an object if provided');
    }
  }
}

/**
 * Builds deterministic job ID strings for deduplication and idempotency
 * Combines type and variable parts with ':' separator
 *
 * Examples:
 *   buildJobId('notif-email', notificationId) → 'notif-email:123'
 *   buildJobId('notif-sms', notificationId) → 'notif-sms:123'
 *   buildJobId('pool-email', eventType, entityId) → 'pool-email:meeting.submitted:abc-123'
 *   buildJobId('otp-email', userId, purpose, windowSlot) → 'otp-email:u1:registration_verification:329847'
 *
 * @param {string} type - Job type identifier
 * @param {...*} parts - Variable parts to append (converted to string)
 * @returns {string} Deterministic job ID
 */
function buildJobId(type, ...parts) {
  if (!type || typeof type !== 'string') {
    throw new TypeError('Job type must be a non-empty string');
  }

  if (parts.length === 0) {
    return type;
  }

  // Convert all parts to strings and join with ':'
  const stringParts = parts.map((part, i) => {
    // Guard: null, undefined, or empty string
    if (part === null || part === undefined || String(part).trim() === '') {
      throw new TypeError(`buildJobId: part at index ${i} must not be null, undefined, or empty string`);
    }

    // Guard: object type
    if (typeof part === 'object') {
      throw new TypeError(`buildJobId: part at index ${i} must be a primitive, not an object`);
    }

    return String(part);
  });

  return `${type}:${stringParts.join(':')}`;
}

/**
 * Default job options for BullMQ queue
 * Applied to all enqueued jobs unless overridden
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 2000 }, // 2s → 4s → 8s → 16s
  removeOnComplete: { count: 500, age: 86400 },    // keep last 500 or 24 h, whichever is smaller
  removeOnFail:     { count: 1000, age: 604800 },  // keep last 1000 or 7 days for post-mortem
};

/**
 * OTP deduplication window: 5 minutes
 * Prevents duplicate OTP emails within same OTP lifecycle but allows re-send after expiry
 */
const OTP_WINDOW_MS = 5 * 60 * 1000; // 5-minute OTP deduplication window

/**
 * Helper function to calculate OTP window slot (5-minute windows)
 * Prevents duplicate OTP emails within same OTP lifecycle but allows re-send after expiry
 *
 * @returns {number} Current 5-minute window slot
 */
function getOtpWindowSlot() {
  return Math.floor(Date.now() / OTP_WINDOW_MS);
}

// Exports
module.exports = {
  JOBS,
  validateJobPayload,
  buildJobId,
  DEFAULT_JOB_OPTIONS,
  OTP_WINDOW_MS,
  getOtpWindowSlot,
};
