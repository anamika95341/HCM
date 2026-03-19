const redis = require('../../config/redis');

function getRecentMinuteBuckets() {
  const buckets = [];
  const now = new Date();
  for (let index = 0; index < 4; index += 1) {
    const bucket = new Date(now.getTime() - index * 60_000).toISOString().slice(0, 16);
    buckets.push(bucket);
  }
  return buckets;
}

async function collectAppMetrics() {
  const buckets = getRecentMinuteBuckets();
  const pipeline = redis.pipeline();
  for (const bucket of buckets) {
    pipeline.get(`metrics:req:total:${bucket}`);
    pipeline.get(`metrics:res:duration:${bucket}`);
    pipeline.get(`metrics:req:errors:${bucket}`);
  }
  pipeline.get('metrics:ws:active');
  const replies = await pipeline.exec();

  let totalRequests = 0;
  let totalDuration = 0;
  let totalErrors = 0;
  for (let index = 0; index < buckets.length; index += 1) {
    totalRequests += Number(replies[index * 3][1] || 0);
    totalDuration += Number(replies[index * 3 + 1][1] || 0);
    totalErrors += Number(replies[index * 3 + 2][1] || 0);
  }

  return {
    reqPerSec: Number((totalRequests / 240).toFixed(2)),
    avgResponseTimeMs: totalRequests ? Number((totalDuration / totalRequests).toFixed(2)) : 0,
    errorRatePct: totalRequests ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0,
    activeWsConnections: Number(replies[replies.length - 1][1] || 0),
  };
}

module.exports = { collectAppMetrics };
