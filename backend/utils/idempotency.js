const crypto = require('crypto');
const createHttpError = require('http-errors');
const pool = require('../config/database');
const logger = require('./logger');
const { normalizeObjectStrings } = require('./normalize');

function buildRequestFingerprint({ scope, actorId, body, file }) {
  const normalizedBody = normalizeObjectStrings(body || {});
  const fileMeta = file
    ? {
      originalName: file.originalname || '',
      mimeType: file.mimetype || '',
      size: file.size || 0,
    }
    : null;

  return crypto.createHash('sha256')
    .update(JSON.stringify({ scope, actorId, body: normalizedBody, file: fileMeta }))
    .digest('hex');
}

function buildRedisKey({ scope, explicitKey, actorId, body, file }) {
  const normalizedExplicitKey = typeof explicitKey === 'string' ? explicitKey.trim() : '';
  if (normalizedExplicitKey) {
    return {
      key: `idempotency:${scope}:${normalizedExplicitKey}`,
      source: 'header',
    };
  }

  return {
    key: `idempotency:${scope}:derived:${buildRequestFingerprint({ scope, actorId, body, file })}`,
    source: 'derived',
  };
}

async function claimIdempotency(redis, { scope, explicitKey, actorId, body, file, payload, ttlSeconds = 600 }) {
  const keyInfo = buildRedisKey({ scope, explicitKey, actorId, body, file });
  const requestHash = buildRequestFingerprint({ scope, actorId, body, file });

  try {
    const existing = await redis.get(keyInfo.key);
    if (existing) {
      return {
        ...keyInfo,
        bypassed: false,
        existing: JSON.parse(existing),
      };
    }

    const pending = JSON.stringify({ pending: true, payload: payload || null });
    const claimed = await redis.set(keyInfo.key, pending, 'EX', ttlSeconds, 'NX');

    if (!claimed) {
      const current = await redis.get(keyInfo.key);
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed.pending) {
          const error = new Error('Request is already being processed');
          error.status = 409;
          throw error;
        }
        return {
          ...keyInfo,
          bypassed: false,
          existing: parsed,
        };
      }

      const error = new Error('Duplicate request detected');
      error.status = 409;
      throw error;
    }

    return {
      ...keyInfo,
      bypassed: false,
      existing: null,
      ttlSeconds,
    };
  } catch (error) {
    if (error?.status === 409) {
      throw error;
    }

    logger.warn('Idempotency Redis store unavailable; using database fallback', {
      scope,
      actorId,
      keySource: keyInfo.source,
      error,
    });
    try {
      const inserted = await pool.query(
        `INSERT INTO idempotency_requests (scope, actor_id, idempotency_key, request_hash, status, expires_at)
         VALUES ($1,$2,$3,$4,'pending', NOW() + ($5 || ' seconds')::interval)
         ON CONFLICT (scope, actor_id, idempotency_key) DO NOTHING
         RETURNING id`,
        [scope, actorId, keyInfo.key, requestHash, String(ttlSeconds)]
      );

      if (inserted.rows[0]) {
        return {
          ...keyInfo,
          scope,
          actorId,
          bypassed: false,
          backend: 'database',
          existing: null,
          ttlSeconds,
          requestHash,
        };
      }

      const current = await pool.query(
        `SELECT request_hash, status, response_body
           FROM idempotency_requests
          WHERE scope = $1 AND actor_id = $2 AND idempotency_key = $3`,
        [scope, actorId, keyInfo.key]
      );
      const row = current.rows[0];
      if (!row) {
        throw createHttpError(409, 'Duplicate request detected');
      }
      if (row.request_hash !== requestHash) {
        throw createHttpError(409, 'Idempotency key reuse with a different payload is not allowed');
      }
      if (row.status === 'pending') {
        throw createHttpError(409, 'Request is already being processed');
      }
      return {
        ...keyInfo,
        scope,
        actorId,
        bypassed: false,
        backend: 'database',
        existing: row.response_body,
        ttlSeconds,
        requestHash,
      };
    } catch (dbError) {
      if (dbError?.status === 409 || dbError?.statusCode === 409) {
        throw dbError;
      }
      logger.error('Idempotency database fallback unavailable', {
        scope,
        actorId,
        keySource: keyInfo.source,
        error: dbError,
      });
      throw createHttpError(503, 'Request coordination service is temporarily unavailable');
    }
  }
}

async function storeIdempotencyResult(redis, claim, result) {
  if (!claim) {
    return;
  }

  if (claim.backend === 'database') {
    await pool.query(
      `UPDATE idempotency_requests
          SET status = 'completed',
              response_body = $4::jsonb,
              updated_at = NOW()
        WHERE scope = $1 AND actor_id = $2 AND idempotency_key = $3`,
      [claim.scope, claim.actorId, claim.key, JSON.stringify(result)]
    );
    return;
  }

  try {
    await redis.set(claim.key, JSON.stringify(result), 'EX', claim.ttlSeconds || 600);
  } catch (error) {
    logger.warn('Failed to persist idempotency result', {
      key: claim.key,
      scope: claim.key.split(':')[1] || 'unknown',
      error,
    });
  }
}

async function clearIdempotency(redis, claim) {
  if (!claim) {
    return;
  }

  if (claim.backend === 'database') {
    try {
      await pool.query(
        `DELETE FROM idempotency_requests
          WHERE scope = $1 AND actor_id = $2 AND idempotency_key = $3`,
        [claim.scope, claim.actorId, claim.key]
      );
    } catch (error) {
      logger.warn('Failed to clear idempotency lock from database fallback', {
        key: claim.key,
        scope: claim.scope,
        error,
      });
    }
    return;
  }

  try {
    await redis.del(claim.key);
  } catch (error) {
    logger.warn('Failed to clear idempotency lock', {
      key: claim.key,
      scope: claim.key.split(':')[1] || 'unknown',
      error,
    });
  }
}

module.exports = {
  claimIdempotency,
  storeIdempotencyResult,
  clearIdempotency,
};
