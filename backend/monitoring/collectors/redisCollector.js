const redis = require('../../config/redis');

function parseRedisInfo(raw) {
  return Object.fromEntries(
    raw.split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split(':'))
      .filter((parts) => parts.length === 2)
      .map(([key, value]) => [key, value.trim()])
  );
}

async function collectRedisMetrics() {
  const info = parseRedisInfo(await redis.info());
  const used = Number(info.used_memory || 0);
  const max = Number(info.maxmemory || 0);
  const hits = Number(info.keyspace_hits || 0);
  const misses = Number(info.keyspace_misses || 0);
  return {
    usedMemoryMB: Number((used / 1024 / 1024).toFixed(2)),
    memoryPercent: max > 0 ? Number(((used / max) * 100).toFixed(2)) : 0,
    connectedClients: Number(info.connected_clients || 0),
    hitRatePercent: hits + misses > 0 ? Number(((hits / (hits + misses)) * 100).toFixed(2)) : 100,
    evictedKeys: Number(info.evicted_keys || 0),
  };
}

module.exports = { collectRedisMetrics };
