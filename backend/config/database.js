const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// WHY: In cluster mode, each worker process has its own pool. With N workers × max:10
// connections = N×10 total connections. POOL_MAX_PER_WORKER lets ops tune this.
// Default 5 per worker: 8 CPUs × 5 = 40 connections — safe under PostgreSQL's default max_connections=100.
const poolMax = Number(process.env.POOL_MAX_PER_WORKER || 5);
const poolMin = Math.max(1, Math.min(2, poolMax - 1));

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: poolMax,
  min: poolMin,
  connectionTimeoutMillis: 3000,
  keepAlive: true,
  ssl: env.databaseSsl ? { rejectUnauthorized: env.databaseSslRejectUnauthorized } : false,
});

pool.on('error', (error) => {
  logger.error('Unexpected Postgres pool error', { error });
});

module.exports = pool;
