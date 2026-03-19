const redis = require('../config/redis');

async function storeSnapshot(snapshot) {
  const key = `monitor:snapshots:${new Date().toISOString().slice(0, 13)}`;
  await redis.rpush(key, JSON.stringify(snapshot));
  await redis.expire(key, 172800);
}

module.exports = { storeSnapshot };
