const THRESHOLDS = {
  cpu: { warning: 60, critical: 85, cooldown: 300 },
  ram: { warning: 70, critical: 85, cooldown: 300 },
  disk: { warning: 70, critical: 85, cooldown: 3600 },
  reqPerSec: { warning: 80, critical: 150, cooldown: 120 },
  responseTimeMs: { warning: 500, critical: 2000, cooldown: 180 },
  errorRatePct: { warning: 2, critical: 10, cooldown: 120 },
  dbConnections: { warning: 35, critical: 45, cooldown: 180 },
  dbQueryTimeMs: { warning: 200, critical: 1000, cooldown: 180 },
  redisMemoryPct: { warning: 75, critical: 90, cooldown: 300 },
  containerDown: { cooldown: 0 },
};

const COLLECTION_INTERVAL_MS = 15_000;
const DAILY_DIGEST_HOUR = 8;

module.exports = {
  THRESHOLDS,
  COLLECTION_INTERVAL_MS,
  DAILY_DIGEST_HOUR,
};
