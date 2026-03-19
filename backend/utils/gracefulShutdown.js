const logger = require('./logger');

function setupGracefulShutdown(server, pool, redisClient, extraShutdowns = []) {
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info('Graceful shutdown initiated', { signal, pid: process.pid });

    const hardTimeout = setTimeout(() => {
      logger.error('Forced shutdown after timeout', { signal, pid: process.pid });
      process.exit(1);
    }, 10_000);

    try {
      await new Promise((resolve) => server.close(resolve));
      await Promise.allSettled([
        pool?.end?.(),
        redisClient?.quit?.(),
        ...extraShutdowns.map((fn) => fn()),
      ]);
      clearTimeout(hardTimeout);
      process.exit(0);
    } catch (error) {
      clearTimeout(hardTimeout);
      logger.error('Graceful shutdown failed', { error, signal, pid: process.pid });
      process.exit(1);
    }
  }

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => shutdown(signal));
  });
}

module.exports = { setupGracefulShutdown };
