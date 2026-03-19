const { THRESHOLDS } = require('../thresholds');
const { sendTelegramAlert } = require('./telegram');

class AlertManager {
  constructor() {
    this.lastAlertTime = new Map();
    this.history = [];
  }

  shouldSend(metricKey, cooldownSeconds) {
    const now = Date.now();
    const last = this.lastAlertTime.get(metricKey) || 0;
    if (cooldownSeconds === 0 || now - last >= cooldownSeconds * 1000) {
      this.lastAlertTime.set(metricKey, now);
      return true;
    }
    return false;
  }

  async fire(metricKey, severity, title, current, threshold, snapshot) {
    const config = THRESHOLDS[metricKey] || { cooldown: 0 };
    if (!this.shouldSend(`${metricKey}:${severity}`, config.cooldown)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const emoji = severity === 'critical' ? '🔴' : '🟡';
    const message = `${emoji} ${severity.toUpperCase()} — ${title}
Current:    ${current}  |  Threshold: ${threshold}
Time:       ${timestamp}

Snapshot:
  CPU      ${snapshot.system.cpuPercent}%
  RAM      ${snapshot.system.ramPercent}%  (${snapshot.system.ramUsedMB} MB / ${snapshot.system.ramTotalMB} MB)
  Disk     ${snapshot.system.diskPercent}%
  Req/sec  ${snapshot.app.reqPerSec}
  DB conn  ${snapshot.db.activeConnections}/50

This is informational only. No action was taken.`;

    this.history.push({ metricKey, severity, current, threshold, timestamp, snapshot });
    await sendTelegramAlert(message);
  }

  async checkMetrics(snapshot) {
    await this.checkSimpleMetric('cpu', 'CPU Usage', snapshot.system.cpuPercent, snapshot);
    await this.checkSimpleMetric('ram', 'RAM Usage', snapshot.system.ramPercent, snapshot);
    await this.checkSimpleMetric('disk', 'Disk Usage', snapshot.system.diskPercent, snapshot);
    await this.checkSimpleMetric('reqPerSec', 'Request Rate', snapshot.app.reqPerSec, snapshot);
    await this.checkSimpleMetric('responseTimeMs', 'Average Response Time', snapshot.app.avgResponseTimeMs, snapshot);
    await this.checkSimpleMetric('errorRatePct', 'Error Rate', snapshot.app.errorRatePct, snapshot);
    await this.checkSimpleMetric('dbConnections', 'DB Connections', snapshot.db.activeConnections, snapshot);
    await this.checkSimpleMetric('dbQueryTimeMs', 'DB Slowest Query', snapshot.db.slowestQueryMs, snapshot);
    await this.checkSimpleMetric('redisMemoryPct', 'Redis Memory', snapshot.redis.memoryPercent, snapshot);

    for (const container of snapshot.docker) {
      if (container.status !== 'running') {
        await this.fire('containerDown', 'critical', `Container Down: ${container.name}`, container.status, 'running', snapshot);
      }
    }
    if (snapshot.redis.evictedKeys > 0) {
      await this.fire('redisMemoryPct', 'warning', 'Redis Evictions', snapshot.redis.evictedKeys, 0, snapshot);
    }
  }

  async checkSimpleMetric(metricKey, title, value, snapshot) {
    const config = THRESHOLDS[metricKey];
    if (!config) {
      return;
    }
    if (value >= config.critical) {
      await this.fire(metricKey, 'critical', title, value, config.critical, snapshot);
    } else if (value >= config.warning) {
      await this.fire(metricKey, 'warning', title, value, config.warning, snapshot);
    }
  }
}

module.exports = new AlertManager();
