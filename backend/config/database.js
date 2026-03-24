const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  min: 2,
  connectionTimeoutMillis: 3000,
  keepAlive: true,
  ssl: env.databaseSsl ? { rejectUnauthorized: env.databaseSslRejectUnauthorized } : false,
});

pool.on('error', (error) => {
  logger.error('Unexpected Postgres pool error', { error });
});

module.exports = pool;
