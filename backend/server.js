const cluster = require('cluster');
const os = require('os');
const http = require('http');
const { createApp } = require('./app');
const env = require('./config/env');
const pool = require('./config/database');
const redis = require('./config/redis');
const logger = require('./utils/logger');
const { setupGracefulShutdown } = require('./utils/gracefulShutdown');
const { initializeWebSocket } = require('./realtime/wsServer');

if (cluster.isPrimary) {
  const workers = Math.max(1, os.cpus().length);
  logger.info('Primary process online', { pid: process.pid, workers });

  for (let index = 0; index < workers; index += 1) {
    const worker = cluster.fork();
    logger.info('Worker forked', { workerPid: worker.process.pid });
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.error('Worker exited; forking replacement', {
      workerPid: worker.process.pid,
      code,
      signal,
    });
    const replacement = cluster.fork();
    logger.info('Replacement worker forked', { workerPid: replacement.process.pid });
  });

  process.on('SIGTERM', () => {
    Object.values(cluster.workers).forEach((worker) => worker.send({ type: 'shutdown' }));
  });
} else {
  const app = createApp();
  const server = http.createServer(app);
  const wsHandle = initializeWebSocket(server);

  server.listen(env.port, () => {
    logger.info('Worker listening', { pid: process.pid, port: env.port });
  });

  process.on('message', (message) => {
    if (message?.type === 'shutdown') {
      process.kill(process.pid, 'SIGTERM');
    }
  });

  setupGracefulShutdown(server, pool, redis, [wsHandle.shutdown]);
}
