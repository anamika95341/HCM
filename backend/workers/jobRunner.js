const { Worker } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../utils/logger');

function createWorker(queueName, concurrency, processor) {
  return new Worker(queueName, processor, {
    concurrency,
    connection: redis,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 1000 },
    settings: {
      backoffStrategies: {
        exponential(attemptsMade) {
          return Math.min(1000 * (2 ** attemptsMade), 30000);
        },
      },
    },
  });
}

const workers = [
  createWorker('email', 5, async (job) => {
    logger.info('Processing email job', { jobId: job.id, queue: 'email' });
  }),
  createWorker('sms', 5, async (job) => {
    logger.info('Processing sms job', { jobId: job.id, queue: 'sms' });
  }),
  createWorker('pdf', 2, async (job) => {
    logger.info('Processing pdf job', { jobId: job.id, queue: 'pdf' });
  }),
  createWorker('notification', 10, async (job) => {
    logger.info('Processing notification job', { jobId: job.id, queue: 'notification' });
  }),
];

for (const worker of workers) {
  worker.on('failed', (job, error) => {
    logger.error('BullMQ worker failed job', { jobId: job?.id, error });
  });
}

async function shutdown() {
  await Promise.allSettled(workers.map((worker) => worker.close()));
  await redis.quit();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
