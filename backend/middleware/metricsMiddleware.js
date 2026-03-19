const redis = require('../config/redis');
const env = require('../config/env');

module.exports = function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const minuteBucket = new Date().toISOString().slice(0, 16);
    const ttl = env.redisMetricsTtlSeconds;

    redis.pipeline()
      .incr(`metrics:req:total:${minuteBucket}`)
      .incrbyfloat(`metrics:res:duration:${minuteBucket}`, durationMs)
      .expire(`metrics:req:total:${minuteBucket}`, ttl)
      .expire(`metrics:res:duration:${minuteBucket}`, ttl)
      .exec()
      .catch(() => {});

    if (res.statusCode >= 500) {
      redis.pipeline()
        .incr(`metrics:req:errors:${minuteBucket}`)
        .expire(`metrics:req:errors:${minuteBucket}`, ttl)
        .exec()
        .catch(() => {});
    }
  });

  next();
};
