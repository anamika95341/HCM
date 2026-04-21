'use strict';

const { Queue } = require('bullmq');
const { createRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const {
  JOBS,
  validateJobPayload,
  buildJobId,
  DEFAULT_JOB_OPTIONS,
} = require('./jobs');

/**
 * Creates a dedicated Redis connection for BullMQ
 * BullMQ requires maxRetriesPerRequest: null and enableReadyCheck: false
 * These settings are incompatible with the shared app redis instance,
 * so each queue must have its own dedicated connection.
 * @private
 */
function makeBullConnection() {
  const conn = createRedisClient({
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  // WHY: Dedicated connections for BullMQ have no listener from config/redis.js.
  // Without this, an ioredis 'error' event would crash the process (unhandled EventEmitter error).
  conn.on('error', (err) =>
    logger.error('BullMQ queue Redis connection error', { error: err.message })
  );
  return conn;
}

let emailQueueInstance = null;
let smsQueueInstance = null;

function getEmailQueue() {
  if (!emailQueueInstance) {
    emailQueueInstance = new Queue('email', {
      connection: makeBullConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return emailQueueInstance;
}

function getSmsQueue() {
  if (!smsQueueInstance) {
    smsQueueInstance = new Queue('sms', {
      connection: makeBullConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return smsQueueInstance;
}

/**
 * Map job names to queues to prevent accidental misrouting
 * (e.g. sending a sendEmail job to the sms queue where no worker would consume it)
 */
const JOB_QUEUE_MAP = {
  [JOBS.SEND_EMAIL]: getEmailQueue,
  [JOBS.SEND_SMS]: getSmsQueue,
  [JOBS.SEND_EMAIL_BATCH]: getEmailQueue,
};

/**
 * Safely enqueues a job to the correct queue based on job name
 * Validates payload before enqueueing, rethrows errors for caller to handle
 *
 * @param {string} jobName - Job name from JOBS constant
 * @param {object} payload - Job payload (validated against schema)
 * @param {object} options - BullMQ job options (e.g., { jobId, delay, priority })
 * @throws {TypeError} If jobName is unknown or payload validation fails
 * @throws {Error} If queue.add() fails
 */
async function enqueue(jobName, payload, options = {}) {
  const getQueue = JOB_QUEUE_MAP[jobName];
  if (!getQueue) {
    throw new TypeError(`enqueue: unknown job name "${jobName}" — not mapped to any queue`);
  }
  const queue = getQueue();

  // Validate payload before enqueueing (throws TypeError if invalid)
  validateJobPayload(jobName, payload);

  // Add job to queue (caller handles errors with swallow-log pattern)
  const job = await queue.add(jobName, payload, options);

  // Log enqueued job with jobId, queueName and correlationId for observability
  logger.info('Job enqueued', {
    jobName,
    queueName: queue.name,
    jobId: job.id,
    correlationId: payload?.correlationId,
  });

  return job;
}

// Export queue instances and utilities
module.exports = {
  enqueue,
  getEmailQueue,
  getSmsQueue,
  // Re-export job contract utilities for convenience
  // Services only need to require('../../queues/index')
  JOBS,
  buildJobId,
  validateJobPayload,
};

Object.defineProperty(module.exports, 'emailQueue', {
  enumerable: true,
  get: getEmailQueue,
});

Object.defineProperty(module.exports, 'smsQueue', {
  enumerable: true,
  get: getSmsQueue,
});
