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
  return createRedisClient({
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/**
 * Email queue - handles transactional and promotional emails
 * Created once at module load (singleton pattern)
 */
const emailQueue = new Queue('email', {
  connection: makeBullConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

/**
 * SMS queue - handles SMS notifications
 * Created once at module load (singleton pattern)
 */
const smsQueue = new Queue('sms', {
  connection: makeBullConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

/**
 * Safely enqueues a job to the specified queue
 * Validates payload before enqueueing, rethrows errors for caller to handle
 *
 * @param {Queue} queue - BullMQ queue instance (emailQueue or smsQueue)
 * @param {string} jobName - Job name from JOBS constant
 * @param {object} payload - Job payload (validated against schema)
 * @param {object} options - BullMQ job options (e.g., { jobId, delay, priority })
 * @throws {TypeError} If payload validation fails
 * @throws {Error} If queue.add() fails
 */
async function enqueue(queue, jobName, payload, options = {}) {
  // Validate payload before enqueueing (throws TypeError if invalid)
  validateJobPayload(jobName, payload);

  // Add job to queue (caller handles errors with swallow-log pattern)
  const job = await queue.add(jobName, payload, options);

  // Log enqueued job with jobId and correlationId for observability
  logger.info('Job enqueued', {
    jobName,
    jobId: job.id,
    correlationId: payload?.correlationId,
  });

  return job;
}

// Export queue instances and utilities
module.exports = {
  emailQueue,
  smsQueue,
  enqueue,
  // Re-export job contract utilities for convenience
  // Services only need to require('../../queues/index')
  JOBS,
  buildJobId,
};
