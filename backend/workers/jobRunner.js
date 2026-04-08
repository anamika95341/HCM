'use strict';
// IMPORTANT: This file is a standalone entry point — run it as a separate process
// via `node workers/jobRunner.js` or `npm run worker:jobs`. Do NOT require() it
// from the HTTP server process — that would register duplicate signal handlers
// and potentially double-exit on SIGTERM.

const { Worker } = require('bullmq');
const { createRedisClient } = require('../config/redis');
const { sendMail } = require('../utils/mailer');
const { sendSms } = require('../utils/smsService');
const logger = require('../utils/logger');

function makeBullConnection() {
  return createRedisClient({
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function isPermanentSmtpError(error) {
  // SMTP 5xx codes = permanent failure (bad address, rejected, etc.)
  // These should NOT be retried — they will always fail
  if (error.responseCode >= 500) return true;
  // 421 is "Service temporarily unavailable" — transient, NOT permanent. Do NOT add it here.
  const PERMANENT_CODES = [550, 551, 553, 554];
  if (PERMANENT_CODES.includes(error.code)) return true;
  return false;
}

// Email worker
const emailConn = makeBullConnection();
emailConn.on('error', (err) => logger.error('BullMQ worker Redis error', { error: err.message }));

const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, text, html } = job.data;
    const correlationId = job.opts?.jobId || job.id;

    logger.info('Email job started', {
      jobId: job.id,
      to,
      subject,
      correlationId,
    });

    try {
      await sendMail({ to, subject, text, html });
      logger.info('Email job completed', { jobId: job.id, correlationId });
    } catch (error) {
      if (isPermanentSmtpError(error)) {
        logger.warn('Email job permanent SMTP failure; discarding', {
          jobId: job.id,
          to,
          error: error.message,
          correlationId,
        });
        await job.discard();
        return;
      }
      throw error;
    }
  },
  {
    concurrency: 5,
    connection: emailConn,
    removeOnComplete: { count: 1000, age: 86400 },
    removeOnFail: { count: 1000, age: 604800 },
  }
);

emailWorker.on('failed', (job, error) => {
  logger.error('Worker job failed', {
    jobId: job?.id,
    queue: job?.queueName,
    attemptsMade: job?.attemptsMade,
    maxAttempts: job?.opts?.attempts,
    error: error?.message,
  });
});

emailWorker.on('error', (error) => {
  logger.error('Worker error', { error: error?.message });
});

// SMS worker
const smsConn = makeBullConnection();
smsConn.on('error', (err) => logger.error('BullMQ worker Redis error', { error: err.message }));

const smsWorker = new Worker(
  'sms',
  async (job) => {
    const { to, message } = job.data;
    const correlationId = job.opts?.jobId || job.id;

    logger.info('SMS job started', {
      jobId: job.id,
      correlationId,
    });

    await sendSms({ to, message });
    logger.info('SMS job completed', { jobId: job.id, correlationId });
  },
  {
    concurrency: 5,
    connection: smsConn,
    removeOnComplete: { count: 1000, age: 86400 },
    removeOnFail: { count: 1000, age: 604800 },
  }
);

smsWorker.on('failed', (job, error) => {
  logger.error('Worker job failed', {
    jobId: job?.id,
    queue: job?.queueName,
    attemptsMade: job?.attemptsMade,
    maxAttempts: job?.opts?.attempts,
    error: error?.message,
  });
});

smsWorker.on('error', (error) => {
  logger.error('Worker error', { error: error?.message });
});

const workers = [emailWorker, smsWorker];

async function shutdown() {
  logger.info('Shutting down workers...');
  try {
    await Promise.allSettled(workers.map((worker) => worker.close()));
    await emailConn.quit();
    await smsConn.quit();
    logger.info('Workers shut down successfully');
  } catch (error) {
    logger.error('Error during worker shutdown', { error: error?.message });
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
