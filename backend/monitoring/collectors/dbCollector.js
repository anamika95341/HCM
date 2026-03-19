const pool = require('../../config/database');

async function collectDbMetrics() {
  const [connections, slowest, dbSize, cacheHit, longRunning] = await Promise.all([
    pool.query(`SELECT count(*) FROM pg_stat_activity WHERE state != 'idle'`),
    pool.query(`SELECT COALESCE(MAX(mean_exec_time), 0) AS mean_exec_time FROM pg_stat_statements`),
    pool.query(`SELECT pg_database_size(current_database()) AS size_bytes`),
    pool.query(`
      SELECT CASE WHEN SUM(heap_blks_hit + heap_blks_read) = 0 THEN 100
                  ELSE ROUND((SUM(heap_blks_hit)::numeric / SUM(heap_blks_hit + heap_blks_read)::numeric) * 100, 2)
             END AS hit_ratio
      FROM pg_statio_user_tables
    `),
    pool.query(`SELECT count(*) FROM pg_stat_activity WHERE now() - query_start > interval '1 second' AND state = 'active'`),
  ]);

  return {
    activeConnections: Number(connections.rows[0].count),
    slowestQueryMs: Number(slowest.rows[0].mean_exec_time || 0),
    dbSizeMB: Number((Number(dbSize.rows[0].size_bytes || 0) / 1024 / 1024).toFixed(2)),
    cacheHitRatioPct: Number(cacheHit.rows[0].hit_ratio || 100),
    longRunningQueries: Number(longRunning.rows[0].count),
  };
}

module.exports = { collectDbMetrics };
