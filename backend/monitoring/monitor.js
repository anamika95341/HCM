const logger = require('../utils/logger');
const { COLLECTION_INTERVAL_MS, DAILY_DIGEST_HOUR } = require('./thresholds');
const { collectSystemMetrics } = require('./collectors/systemCollector');
const { collectDockerMetrics } = require('./collectors/dockerCollector');
const { collectAppMetrics } = require('./collectors/appCollector');
const { collectDbMetrics } = require('./collectors/dbCollector');
const { collectRedisMetrics } = require('./collectors/redisCollector');
const alertManager = require('./alerting/alertManager');
const { sendTelegramAlert } = require('./alerting/telegram');
const { sendDailyDigest } = require('./alerting/email');
const { storeSnapshot } = require('./metricsStore');

let lastDigestDate = null;

async function collectAndProcess() {
  try {
    const [system, docker, app, db, redis] = await Promise.all([
      collectSystemMetrics(),
      collectDockerMetrics(),
      collectAppMetrics(),
      collectDbMetrics(),
      collectRedisMetrics(),
    ]);
    const snapshot = { system, docker, app, db, redis, timestamp: new Date().toISOString() };
    await alertManager.checkMetrics(snapshot);
    await storeSnapshot(snapshot);
  } catch (error) {
    logger.error('Monitoring collection cycle failed', { error });
  }
}

async function maybeSendDigest() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  if (now.getHours() !== DAILY_DIGEST_HOUR || lastDigestDate === date) {
    return;
  }
  lastDigestDate = date;
  await sendDailyDigest({
    date,
    summaryHtml: `<h1>Citizen Portal Daily Report</h1><p>Alerts fired: ${alertManager.history.length}</p>`,
  });
}

async function start() {
  logger.info('Monitor online — collecting every 15s');
  await sendTelegramAlert('✅ Monitor online — collecting every 15s');
  await collectAndProcess();
  setInterval(collectAndProcess, COLLECTION_INTERVAL_MS);
  setInterval(maybeSendDigest, 60 * 60 * 1000);
}

start().catch((error) => {
  logger.error('Monitor failed to start', { error });
});
