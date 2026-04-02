# Auth Redis Resilience + Stream Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Redis single-points-of-failure in the auth layer, close the password-reset token invalidation security bug, and add a Redis Stream audit trail for auth events.

**Architecture:** Surgical per-file fixes following the existing flat utility pattern. A new `authStream.js` utility (modelled after `idempotency.js`) publishes structured events to the `auth:events` Redis Stream and swallows errors silently. All Redis calls in auth paths are wrapped with explicit try/catch and fail-open or fail-with-503 semantics depending on function type.

**Tech Stack:** Node.js, ioredis, jsonwebtoken (RS256), bcryptjs, http-errors, Jest 29

---

## File Map

| Action | File | What changes |
|---|---|---|
| **Create** | `backend/utils/authStream.js` | New stream publish utility |
| **Create** | `backend/tests/auth.stream.test.js` | Tests for authStream |
| **Create** | `backend/tests/otp.resilience.test.js` | Tests for OTP 503 behaviour |
| **Create** | `backend/tests/authenticate.resilience.test.js` | Tests for middleware fail-open + password_changed |
| **Create** | `backend/tests/auth.service.resilience.test.js` | Tests for service-layer Redis resilience |
| **Modify** | `backend/utils/otpService.js` | Wrap Redis calls, throw 503 on failure |
| **Modify** | `backend/middleware/rateLimiter.js` | Add `logger.warn` on Redis failure |
| **Modify** | `backend/middleware/authenticate.js` | Fail-open JTI check + password_changed check |
| **Modify** | `backend/modules/auth/auth.service.js` | Wrap lockout/logout/failures, add stream events, optimise refreshSession |

---

## Task 1: Create `authStream.js`

**Files:**
- Create: `backend/utils/authStream.js`
- Create: `backend/tests/auth.stream.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/auth.stream.test.js`:

```js
jest.mock('../utils/logger', () => ({ warn: jest.fn() }));

const logger = require('../utils/logger');

describe('publishAuthEvent', () => {
  let redis;
  let publishAuthEvent;

  beforeEach(() => {
    jest.resetModules();
    redis = { xadd: jest.fn() };
    publishAuthEvent = require('../utils/authStream').publishAuthEvent;
  });

  test('calls xadd with correct stream key and fields', async () => {
    redis.xadd.mockResolvedValue('1234-0');

    await publishAuthEvent(redis, {
      event: 'login_success',
      role: 'citizen',
      userId: 'user-1',
      ip: '127.0.0.1',
      reason: '',
    });

    expect(redis.xadd).toHaveBeenCalledWith(
      'auth:events',
      'MAXLEN', '~', '50000',
      '*',
      'event', 'login_success',
      'role', 'citizen',
      'userId', 'user-1',
      'ip', '127.0.0.1',
      'reason', '',
      'ts', expect.any(String),
    );
  });

  test('does not throw when Redis xadd fails', async () => {
    redis.xadd.mockRejectedValue(new Error('redis down'));

    await expect(
      publishAuthEvent(redis, { event: 'login_failure', role: 'citizen', userId: 'user-1', ip: '1.2.3.4' }),
    ).resolves.toBeUndefined();
  });

  test('logs a warning when Redis xadd fails', async () => {
    redis.xadd.mockRejectedValue(new Error('connection refused'));

    await publishAuthEvent(redis, { event: 'logout', role: 'admin', userId: 'admin-1', ip: '1.2.3.4' });

    expect(logger.warn).toHaveBeenCalledWith(
      'authStream: failed to publish auth event',
      expect.objectContaining({ event: 'logout' }),
    );
  });

  test('handles missing optional fields gracefully', async () => {
    redis.xadd.mockResolvedValue('1234-0');

    await expect(
      publishAuthEvent(redis, { event: 'otp_generated', role: 'citizen', userId: 'user-2' }),
    ).resolves.toBeUndefined();

    expect(redis.xadd).toHaveBeenCalledWith(
      'auth:events',
      'MAXLEN', '~', '50000',
      '*',
      'event', 'otp_generated',
      'role', 'citizen',
      'userId', 'user-2',
      'ip', '',
      'reason', '',
      'ts', expect.any(String),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && npx jest tests/auth.stream.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../utils/authStream'`

- [ ] **Step 3: Create `backend/utils/authStream.js`**

```js
const logger = require('./logger');

async function publishAuthEvent(redis, { event, role, userId, ip, reason } = {}) {
  try {
    await redis.xadd(
      'auth:events',
      'MAXLEN', '~', '50000',
      '*',
      'event', event || '',
      'role', role || '',
      'userId', String(userId || ''),
      'ip', ip || '',
      'reason', reason || '',
      'ts', String(Date.now()),
    );
  } catch (err) {
    logger.warn('authStream: failed to publish auth event', {
      event,
      role,
      userId,
      error: err.message,
    });
  }
}

module.exports = { publishAuthEvent };
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd backend && npx jest tests/auth.stream.test.js --no-coverage
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
cd backend && git add utils/authStream.js tests/auth.stream.test.js
git commit -m "feat: add authStream utility for Redis Stream auth event publishing"
```

---

## Task 2: Fix `otpService.js` — 503 on Redis failure

**Files:**
- Modify: `backend/utils/otpService.js`
- Create: `backend/tests/otp.resilience.test.js`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/otp.resilience.test.js`:

```js
jest.mock('../config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

const redis = require('../config/redis');
const { generateOtp, verifyOtp } = require('../utils/otpService');

describe('otpService Redis resilience', () => {
  beforeEach(() => jest.clearAllMocks());

  test('generateOtp throws 503 when Redis set fails', async () => {
    redis.set.mockRejectedValue(new Error('redis down'));

    await expect(
      generateOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1' }),
    ).rejects.toMatchObject({ status: 503, message: 'OTP service temporarily unavailable, please try again shortly' });
  });

  test('verifyOtp throws 503 when Redis get fails', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));

    await expect(
      verifyOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1', otp: '123456' }),
    ).rejects.toMatchObject({ status: 503, message: 'OTP service temporarily unavailable, please try again shortly' });
  });

  test('generateOtp returns the OTP string when Redis succeeds', async () => {
    redis.set.mockResolvedValue('OK');

    const otp = await generateOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1' });

    expect(typeof otp).toBe('string');
    expect(otp).toMatch(/^\d{6}$/);
  });

  test('verifyOtp returns false when key not found', async () => {
    redis.get.mockResolvedValue(null);

    const result = await verifyOtp({ role: 'citizen', userId: 'user-1', purpose: 'registration_verification', ip: '127.0.0.1', otp: '123456' });

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && npx jest tests/otp.resilience.test.js --no-coverage
```

Expected: first two tests FAIL — `generateOtp` and `verifyOtp` currently throw a generic uncaught Redis error, not a 503 http-error.

- [ ] **Step 3: Rewrite `backend/utils/otpService.js`**

```js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const createHttpError = require('http-errors');
const redis = require('../config/redis');

function otpKey({ role, userId, purpose, ip, scope }) {
  return `otp:${role}:${userId}:${purpose}:${scope || ip || 'global'}`;
}

async function generateOtp({ role, userId, purpose, ip, scope }) {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hash = await bcrypt.hash(otp, 10);
  const key = otpKey({ role, userId, purpose, ip, scope });
  try {
    await redis.set(key, hash, 'EX', 300);
  } catch (err) {
    throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly');
  }
  return otp;
}

async function verifyOtp({ role, userId, purpose, ip, scope, otp }) {
  const key = otpKey({ role, userId, purpose, ip, scope });
  let hash;
  try {
    hash = await redis.get(key);
  } catch (err) {
    throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly');
  }
  if (!hash) {
    return false;
  }
  const valid = await bcrypt.compare(otp, hash);
  if (valid) {
    await redis.del(key);
  }
  return valid;
}

module.exports = { generateOtp, verifyOtp };
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npx jest tests/otp.resilience.test.js --no-coverage
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
cd backend && git add utils/otpService.js tests/otp.resilience.test.js
git commit -m "fix: throw 503 on Redis failure in otpService instead of crashing"
```

---

## Task 3: Fix `rateLimiter.js` — warn on Redis failure

**Files:**
- Modify: `backend/middleware/rateLimiter.js`

- [ ] **Step 1: Write the failing test**

Add a new file `backend/tests/rate.limiter.resilience.test.js`:

```js
jest.mock('../config/redis', () => ({
  incr: jest.fn(),
  expire: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
}));

const redis = require('../config/redis');
const logger = require('../utils/logger');
const rateLimiter = require('../middleware/rateLimiter');

describe('rateLimiter Redis resilience', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calls next() when Redis incr throws', async () => {
    redis.incr.mockRejectedValue(new Error('redis down'));
    const req = { method: 'POST', path: '/auth/login', user: null, ip: '127.0.0.1', body: {} };
    const res = {};
    const next = jest.fn();

    await rateLimiter.auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).toBeUndefined();
  });

  test('logs a warning when Redis incr throws', async () => {
    redis.incr.mockRejectedValue(new Error('redis down'));
    const req = { method: 'POST', path: '/auth/login', user: null, ip: '127.0.0.1', body: {} };
    const res = {};
    const next = jest.fn();

    await rateLimiter.auth(req, res, next);

    expect(logger.warn).toHaveBeenCalledWith(
      'Rate limiter Redis unavailable, bypassing',
      expect.objectContaining({ error: 'redis down' }),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && npx jest tests/rate.limiter.resilience.test.js --no-coverage
```

Expected: second test FAIL — `logger.warn` is never called in the current catch block.

- [ ] **Step 3: Modify `backend/middleware/rateLimiter.js`**

Replace the entire file:

```js
const redis = require('../config/redis');
const logger = require('../utils/logger');

function createLimiter({ windowSeconds, max, prefix, skip, identifierResolver }) {
  return async function limit(req, res, next) {
    try {
      if (typeof skip === 'function' && skip(req)) {
        return next();
      }

      const identifier = typeof identifierResolver === 'function'
        ? identifierResolver(req)
        : (req.user?.sub || req.ip);

      const normalizedIdentifier = String(identifier || req.ip || 'anonymous');
      const key = `ratelimit:${prefix}:${normalizedIdentifier}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      if (count > max) {
        res.setHeader('Retry-After', String(windowSeconds));
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
      return next();
    } catch (error) {
      logger.warn('Rate limiter Redis unavailable, bypassing', {
        prefix,
        error: error.message,
      });
      return next();
    }
  };
}

function authIdentifier(req) {
  const body = req.body || {};
  return body.usernameOrEmail || body.citizenId || body.email || req.ip;
}

function hasBearerAuthHeader(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  return typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
}

module.exports = {
  general: createLimiter({
    windowSeconds: 60,
    max: 240,
    prefix: 'general',
    skip: (req) => (
      req.method === 'OPTIONS'
      || req.path === '/health'
      || ((req.method === 'GET' || req.method === 'HEAD') && hasBearerAuthHeader(req))
    ),
  }),
  auth: createLimiter({
    windowSeconds: 60,
    max: 8,
    prefix: 'auth',
    identifierResolver: authIdentifier,
  }),
  uploads: createLimiter({ windowSeconds: 60, max: 12, prefix: 'upload' }),
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npx jest tests/rate.limiter.resilience.test.js --no-coverage
```

Expected: PASS — 2 tests pass

- [ ] **Step 5: Commit**

```bash
cd backend && git add middleware/rateLimiter.js tests/rate.limiter.resilience.test.js
git commit -m "fix: log warning when rate limiter Redis is unavailable"
```

---

## Task 4: Fix `authenticate.js` — fail-open + password_changed check

**Files:**
- Modify: `backend/middleware/authenticate.js`
- Create: `backend/tests/authenticate.resilience.test.js`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/authenticate.resilience.test.js`:

```js
jest.mock('jsonwebtoken');
jest.mock('../config/redis', () => ({ get: jest.fn() }));
jest.mock('../config/jwt', () => ({
  getRoleConfig: jest.fn().mockReturnValue({
    publicKey: 'mock-pub-key',
    issuer: 'hcm',
    audience: 'citizen',
  }),
}));
jest.mock('../modules/auth/auth.repository', () => ({
  findActiveUserById: jest.fn(),
}));
jest.mock('../utils/logger', () => ({ warn: jest.fn() }));
jest.mock('../utils/authStream', () => ({ publishAuthEvent: jest.fn().mockResolvedValue(undefined) }));

const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const authRepository = require('../modules/auth/auth.repository');
const { publishAuthEvent } = require('../utils/authStream');
const authenticate = require('../middleware/authenticate');

function makeReq(token = 'Bearer mock.token') {
  return {
    headers: { authorization: token },
    originalUrl: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware — Redis resilience', () => {
  const validPayload = { sub: 'user-1', role: 'citizen', jti: 'jti-abc', iat: 1000000, exp: 9999999999 };

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.verify.mockReturnValue(validPayload);
    authRepository.findActiveUserById.mockResolvedValue({ id: 'user-1' });
  });

  test('calls next() when Redis JTI check throws (fail-open)', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  test('publishes token_revoke_check_bypassed event when Redis JTI check throws', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));
    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(publishAuthEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: 'token_revoke_check_bypassed', role: 'citizen' }),
    );
  });

  test('returns 401 when JTI is found in revocation list', async () => {
    redis.get
      .mockResolvedValueOnce('1')   // JTI revoked
      .mockResolvedValueOnce(null); // password_changed (not reached)
    const next = jest.fn();
    const res = makeRes();

    await authenticate('citizen')(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when password was changed after token was issued', async () => {
    const iat = Math.floor(Date.now() / 1000) - 300; // token issued 5 minutes ago
    jwt.verify.mockReturnValue({ ...validPayload, iat });
    // password changed 1 minute ago (after token was issued)
    const changedAt = String(Date.now() - 60 * 1000);

    redis.get
      .mockResolvedValueOnce(null)       // JTI: not revoked
      .mockResolvedValueOnce(changedAt); // password_changed: after iat

    const next = jest.fn();
    const res = makeRes();

    await authenticate('citizen')(makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() when password_changed key is older than token iat', async () => {
    const iat = Math.floor(Date.now() / 1000) - 60; // token issued 1 min ago
    jwt.verify.mockReturnValue({ ...validPayload, iat });
    // password was changed 5 minutes ago (before token was issued)
    const changedAt = String(Date.now() - 5 * 60 * 1000);

    redis.get
      .mockResolvedValueOnce(null)       // JTI: not revoked
      .mockResolvedValueOnce(changedAt); // password_changed: before iat

    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  test('calls next() when password_changed Redis check throws (fail-open)', async () => {
    redis.get
      .mockResolvedValueOnce(null)                        // JTI: not revoked
      .mockRejectedValueOnce(new Error('redis down'));    // password_changed: error

    const next = jest.fn();

    await authenticate('citizen')(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && npx jest tests/authenticate.resilience.test.js --no-coverage
```

Expected: multiple failures — `password_changed` check does not exist yet; Redis failure returns 401 instead of calling `next()`.

- [ ] **Step 3: Rewrite `backend/middleware/authenticate.js`**

```js
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
const authRepository = require('../modules/auth/auth.repository');
const { publishAuthEvent } = require('../utils/authStream');
const logger = require('../utils/logger');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
}

function authenticate(expectedRole) {
  return async (req, res, next) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        logger.warn('Authentication failed', {
          reason: 'missing_bearer_token',
          expectedRole,
          path: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const config = getRoleConfig(expectedRole);
      const payload = jwt.verify(token, config.publicKey, {
        algorithms: ['RS256'],
        audience: expectedRole,
        issuer: config.issuer,
      });

      // JTI revocation check — fail-open on Redis error
      try {
        const revoked = await redis.get(`revoked:jti:${payload.jti}`);
        if (revoked) {
          logger.warn('Authentication failed', {
            reason: 'revoked_token',
            expectedRole,
            tokenSub: payload.sub,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
          });
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (err) {
        logger.warn('authenticate: Redis JTI check unavailable, continuing (fail-open)', {
          jti: payload.jti,
          expectedRole,
          error: err.message,
        });
        await publishAuthEvent(redis, {
          event: 'token_revoke_check_bypassed',
          role: expectedRole,
          userId: payload.sub,
          ip: req.ip,
          reason: 'redis_down',
        });
      }

      // Password-changed invalidation check — fail-open on Redis error
      try {
        const changedAt = await redis.get(`password_changed:${expectedRole}:${payload.sub}`);
        if (changedAt && Number(changedAt) > payload.iat * 1000) {
          logger.warn('Authentication failed', {
            reason: 'password_changed_after_token_issued',
            expectedRole,
            tokenSub: payload.sub,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
          });
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (err) {
        logger.warn('authenticate: Redis password-changed check unavailable, continuing (fail-open)', {
          userId: payload.sub,
          expectedRole,
          error: err.message,
        });
      }

      const user = await authRepository.findActiveUserById(expectedRole, payload.sub);
      if (!user) {
        logger.warn('Authentication failed', {
          reason: 'inactive_or_removed_account',
          expectedRole,
          tokenSub: payload.sub,
          path: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      req.user = payload;
      req.token = token;
      return next();
    } catch (error) {
      logger.warn('Authentication failed', {
        reason: error?.name || 'jwt_verification_error',
        message: error?.message,
        expectedRole,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

module.exports = authenticate;
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npx jest tests/authenticate.resilience.test.js --no-coverage
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
cd backend && git add middleware/authenticate.js tests/authenticate.resilience.test.js
git commit -m "fix: fail-open Redis in authenticate middleware + add password_changed invalidation check"
```

---

## Task 5: Fix `auth.service.js` — resilient lockout/logout + stream events + optimise refreshSession

**Files:**
- Modify: `backend/modules/auth/auth.service.js`
- Create: `backend/tests/auth.service.resilience.test.js`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/auth.service.resilience.test.js`:

```js
jest.mock('../config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../utils/authStream', () => ({
  publishAuthEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-1', role: 'citizen', jti: 'jti-1', type: 'refresh', exp: 9999999999 }),
  decode: jest.fn(),
}));

jest.mock('../config/jwt', () => ({
  getRoleConfig: jest.fn().mockReturnValue({
    privateKey: 'mock-priv',
    publicKey: 'mock-pub',
    accessTokenTtl: '15m',
    refreshTokenTtlDays: 30,
    audience: 'citizen',
    issuer: 'hcm',
  }),
}));

jest.mock('../modules/auth/auth.repository', () => ({
  findCitizenByCitizenId: jest.fn(),
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  findActiveRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  findActiveUserById: jest.fn(),
}));

jest.mock('../utils/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../utils/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));

const redis = require('../config/redis');
const { publishAuthEvent } = require('../utils/authStream');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../modules/auth/auth.repository');
const authService = require('../modules/auth/auth.service');

describe('auth.service Redis resilience', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── checkLockout ──────────────────────────────────────────────────────────

  describe('checkLockout (via loginCitizen)', () => {
    test('allows login when Redis get throws', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));
      redis.del.mockResolvedValue(1);
      bcrypt.compare.mockResolvedValue(true);
      authRepository.findCitizenByCitizenId.mockResolvedValue({
        id: 'user-1', is_verified: true, password_hash: '$hash', email: 'a@b.com',
      });
      authRepository.storeRefreshToken.mockResolvedValue(undefined);

      await expect(
        authService.loginCitizen({ citizenId: 'CTZ-2026-00000001', password: 'pass' }, { ip: '127.0.0.1', userAgent: 'jest' }),
      ).resolves.toHaveProperty('accessToken');
    });

    test('publishes lockout_check_bypassed when Redis get throws', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));
      redis.del.mockResolvedValue(1);
      bcrypt.compare.mockResolvedValue(true);
      authRepository.findCitizenByCitizenId.mockResolvedValue({
        id: 'user-1', is_verified: true, password_hash: '$hash', email: 'a@b.com',
      });
      authRepository.storeRefreshToken.mockResolvedValue(undefined);

      await authService.loginCitizen(
        { citizenId: 'CTZ-2026-00000001', password: 'pass' },
        { ip: '127.0.0.1', userAgent: 'jest' },
      );

      expect(publishAuthEvent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ event: 'lockout_check_bypassed', role: 'citizen' }),
      );
    });
  });

  // ── recordLoginFailure ────────────────────────────────────────────────────

  describe('recordLoginFailure (via loginCitizen bad password)', () => {
    test('returns 401 (not 500) when Redis incr throws', async () => {
      redis.get.mockResolvedValue('0'); // checkLockout: not locked
      redis.incr.mockRejectedValue(new Error('redis down'));
      bcrypt.compare.mockResolvedValue(false);
      authRepository.findCitizenByCitizenId.mockResolvedValue({
        id: 'user-1', is_verified: true, password_hash: '$hash', email: 'a@b.com',
      });

      await expect(
        authService.loginCitizen({ citizenId: 'CTZ-2026-00000001', password: 'wrong' }, { ip: '127.0.0.1', userAgent: 'jest' }),
      ).rejects.toMatchObject({ status: 401 });
    });

    test('publishes login_failure to stream even when Redis incr throws', async () => {
      redis.get.mockResolvedValue('0');
      redis.incr.mockRejectedValue(new Error('redis down'));
      bcrypt.compare.mockResolvedValue(false);
      authRepository.findCitizenByCitizenId.mockResolvedValue({
        id: 'user-1', is_verified: true, password_hash: '$hash', email: 'a@b.com',
      });

      await authService.loginCitizen(
        { citizenId: 'CTZ-2026-00000001', password: 'wrong' },
        { ip: '127.0.0.1', userAgent: 'jest' },
      ).catch(() => {});

      expect(publishAuthEvent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ event: 'login_failure', role: 'citizen' }),
      );
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    test('returns success message even when Redis set throws', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', role: 'citizen', jti: 'jti-1', exp: 9999999999 });
      redis.set.mockRejectedValue(new Error('redis down'));

      const result = await authService.logout('citizen', 'mock.access.token', null);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    test('publishes token_revoke_failed when Redis set throws', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', role: 'citizen', jti: 'jti-1', exp: 9999999999 });
      redis.set.mockRejectedValue(new Error('redis down'));

      await authService.logout('citizen', 'mock.access.token', null);

      expect(publishAuthEvent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ event: 'token_revoke_failed', role: 'citizen' }),
      );
    });
  });

  // ── loginCitizen success stream event ─────────────────────────────────────

  describe('loginCitizen success', () => {
    test('publishes login_success on successful login', async () => {
      redis.get.mockResolvedValue('0');
      redis.del.mockResolvedValue(1);
      bcrypt.compare.mockResolvedValue(true);
      authRepository.findCitizenByCitizenId.mockResolvedValue({
        id: 'user-1', is_verified: true, password_hash: '$hash', email: 'a@b.com',
      });
      authRepository.storeRefreshToken.mockResolvedValue(undefined);

      await authService.loginCitizen(
        { citizenId: 'CTZ-2026-00000001', password: 'correct' },
        { ip: '127.0.0.1', userAgent: 'jest' },
      );

      expect(publishAuthEvent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ event: 'login_success', role: 'citizen' }),
      );
    });
  });

  // ── refreshSession optimisation ───────────────────────────────────────────

  describe('refreshSession', () => {
    test('verifies only the decoded role instead of all 5 roles', async () => {
      jwt.decode.mockReturnValue({ role: 'admin', type: 'refresh' });
      jwt.verify.mockReturnValue({ sub: 'admin-1', role: 'admin', jti: 'jti-2', type: 'refresh', exp: 9999999999 });
      authRepository.findActiveRefreshToken.mockResolvedValue({
        id: 'rt-1', token_hash: require('../utils/crypto').sha256('mock.jwt.token'),
      });
      authRepository.findActiveUserById.mockResolvedValue({ id: 'admin-1', status: 'active' });
      authRepository.storeRefreshToken.mockResolvedValue(undefined);
      authRepository.revokeRefreshToken.mockResolvedValue(undefined);

      await authService.refreshSession('mock.jwt.token').catch(() => {});

      // jwt.verify should only be called for 'admin', not 5 times
      const verifyCalls = jwt.verify.mock.calls;
      const rolesVerified = verifyCalls.map((c) => {
        // getRoleConfig is called with the role, so we check the audience arg passed to verify
        return c[2]?.audience;
      });
      // 'admin' audience appears, but 'citizen', 'masteradmin', 'deo', 'minister' do not
      expect(rolesVerified.filter((r) => r === 'admin').length).toBeGreaterThanOrEqual(1);
      expect(rolesVerified.filter((r) => r === 'citizen').length).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && npx jest tests/auth.service.resilience.test.js --no-coverage
```

Expected: multiple failures — Redis errors propagate as 500s, `publishAuthEvent` not called, `jwt.verify` called 5 times.

- [ ] **Step 3: Update `backend/modules/auth/auth.service.js`**

Replace the entire file with the following:

```js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createHttpError = require('http-errors');
const redis = require('../../config/redis');
const { getRoleConfig } = require('../../config/jwt');
const { encryptAadhaar, sha256 } = require('../../utils/crypto');
const generateCitizenId = require('../../utils/generateCitizenId');
const { sendMail } = require('../../utils/mailer');
const { sendSms } = require('../../utils/smsService');
const { generateOtp, verifyOtp } = require('../../utils/otpService');
const { verifyCaptcha } = require('../../utils/captchaVerify');
const { writeAuditLog } = require('../../utils/audit');
const { publishAuthEvent } = require('../../utils/authStream');
const logger = require('../../utils/logger');
const authRepository = require('./auth.repository');
const citizenRepository = require('../citizen/citizen.repository');
const { lookupMp } = require('../../utils/mpLookup');

function publicUser(user, role) {
  if (role === 'citizen') {
    return {
      id: user.id,
      citizenId: user.citizen_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      mobileNumber: user.mobile_number,
      state: user.state,
      city: user.city,
      localMp: user.local_mp,
      status: user.status,
      isVerified: user.is_verified,
    };
  }

  if (role === 'masteradmin') {
    return {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number,
      designation: user.designation,
      status: user.status,
    };
  }

  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phoneNumber: user.phone_number,
    designation: user.designation,
    status: user.status,
  };
}

function createAccessToken({ role, userId }) {
  const config = getRoleConfig(role);
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: userId, role, jti },
    config.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: config.accessTokenTtl,
      audience: config.audience,
      issuer: config.issuer,
    }
  );
  return { token, jti };
}

function createRefreshToken({ role, userId }) {
  const config = getRoleConfig(role);
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: userId, role, jti, type: 'refresh' },
    config.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: `${config.refreshTokenTtlDays}d`,
      audience: config.audience,
      issuer: config.issuer,
    }
  );
  return { token, jti };
}

function verifyJwtByRole(role, token) {
  const config = getRoleConfig(role);
  return jwt.verify(token, config.publicKey, {
    algorithms: ['RS256'],
    audience: config.audience,
    issuer: config.issuer,
  });
}

async function issueSession(role, user) {
  const access = createAccessToken({ role, userId: user.id });
  const refresh = createRefreshToken({ role, userId: user.id });
  const refreshPayload = verifyJwtByRole(role, refresh.token);
  await authRepository.storeRefreshToken({
    userRole: role,
    userId: user.id,
    tokenHash: sha256(refresh.token),
    jti: refreshPayload.jti,
    expiresAt: new Date(refreshPayload.exp * 1000),
  });

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    user: publicUser(user, role),
  };
}

async function registerCitizen(payload, reqMeta) {
  let stage = 'start';
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const registrationPayload = {
    ...payload,
    aadhaarHash: sha256(payload.aadhaarNumber),
    aadhaar: encryptAadhaar(payload.aadhaarNumber),
    passwordHash,
    localMp: lookupMp({ state: payload.state }),
  };

  try {
    stage = 'check-existing-citizen';
    const existingCitizen = await citizenRepository.findCitizenByRegistrationConflict({
      email: payload.email,
      aadhaarHash: registrationPayload.aadhaarHash,
      mobileNumber: payload.mobileNumber,
    });

    let citizen;
    let createdNewCitizen = false;
    if (existingCitizen) {
      if (existingCitizen.is_verified || existingCitizen.status === 'active' || existingCitizen.citizen_id) {
        throw createHttpError(409, 'Citizen account already exists. Use login or forgot password.');
      }
      stage = 'update-pending-citizen';
      citizen = await citizenRepository.updatePendingCitizen(existingCitizen.id, registrationPayload);
    } else {
      stage = 'create-citizen';
      citizen = await citizenRepository.createCitizen(registrationPayload);
      createdNewCitizen = true;
    }
    const destination = payload.preferredVerificationChannel === 'email' ? payload.email : payload.mobileNumber;
    try {
      stage = 'generate-otp';
      const otp = await generateOtp({
        role: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
        ip: reqMeta.ip,
      });

      stage = 'clear-old-verification-records';
      await authRepository.clearVerificationRecords({
        userRole: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
      });

      stage = 'insert-verification-record';
      await authRepository.insertVerificationRecord({
        userRole: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
        channel: payload.preferredVerificationChannel,
        destination,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      if (payload.preferredVerificationChannel === 'email') {
        stage = 'send-email';
        await sendMail({
          to: payload.email,
          subject: 'Verify your Citizen Portal account',
          text: `Your OTP is ${otp}. It expires in 5 minutes.`,
        });
      } else {
        stage = 'send-sms';
        await sendSms({
          to: payload.mobileNumber,
          message: `Your OTP is ${otp}. It expires in 5 minutes.`,
        });
      }
    } catch (error) {
      stage = `${stage}-rollback`;
      await authRepository.clearVerificationRecords({
        userRole: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
      });
      if (createdNewCitizen) {
        await citizenRepository.deletePendingCitizenById(citizen.id);
      }
      logger.error('Citizen registration verification dispatch failed', {
        stage,
        email: payload.email,
        mobileNumber: payload.mobileNumber,
        preferredVerificationChannel: payload.preferredVerificationChannel,
        citizenId: citizen.id,
        error,
      });
      throw createHttpError(502, 'Unable to send citizen verification code');
    }

    stage = 'write-audit-log';
    await writeAuditLog({
      actorRole: 'citizen',
      actorId: citizen.id,
      entityType: 'citizen',
      entityId: citizen.id,
      action: 'citizen_registered',
      ipAddress: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    return citizen;
  } catch (error) {
    logger.error('Citizen registration failed', {
      stage,
      email: payload.email,
      mobileNumber: payload.mobileNumber,
      preferredVerificationChannel: payload.preferredVerificationChannel,
      error,
    });
    throw error;
  }
}

async function verifyCitizenRegistration({ userId, otp, ip }, reqMeta) {
  const valid = await verifyOtp({
    role: 'citizen',
    userId,
    purpose: 'registration_verification',
    ip,
    otp,
  });
  if (!valid) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const sequence = Date.now() % 100000000;
  const citizenId = generateCitizenId(sequence);
  await authRepository.updateCitizenVerification(userId, citizenId);
  const user = await authRepository.findUserById('citizen', userId);

  await writeAuditLog({
    actorRole: 'citizen',
    actorId: userId,
    entityType: 'citizen',
    entityId: userId,
    action: 'citizen_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { citizenId, user: publicUser(user, 'citizen') };
}

async function verifyDeoRegistration({ usernameOrEmail, otp }, reqMeta) {
  const user = await authRepository.findDeoByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const validOtp = await verifyOtp({
    role: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
    otp,
  });

  if (!validOtp) {
    await recordLoginFailure({ role: 'deo', userId: user.id, ip: reqMeta.ip });
    throw createHttpError(400, 'Invalid or expired verification code');
  }

  await clearLoginFailures({ role: 'deo', userId: user.id, ip: reqMeta.ip });
  await authRepository.updateDeoVerification(user.id);
  await authRepository.markVerificationRecordVerified({
    userRole: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await writeAuditLog({
    actorRole: 'deo',
    actorId: user.id,
    entityType: 'deo',
    entityId: user.id,
    action: 'deo_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'DEO account verified successfully. You can now log in.' };
}

async function verifyAdminRegistration({ usernameOrEmail, otp }, reqMeta) {
  const user = await authRepository.findAdminByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const validOtp = await verifyOtp({
    role: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
    otp,
  });

  if (!validOtp) {
    await recordLoginFailure({ role: 'admin', userId: user.id, ip: reqMeta.ip });
    throw createHttpError(400, 'Invalid or expired verification code');
  }

  await clearLoginFailures({ role: 'admin', userId: user.id, ip: reqMeta.ip });
  await authRepository.updateAdminVerification(user.id);
  await authRepository.markVerificationRecordVerified({
    userRole: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: user.id,
    entityType: 'admin',
    entityId: user.id,
    action: 'admin_verified',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'Admin account verified successfully. You can now log in.' };
}

async function resendAdminVerificationCode({ usernameOrEmail }, reqMeta) {
  const user = await authRepository.findAdminByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    return { message: 'If that admin account exists, a verification code was sent.' };
  }

  if (user.is_verified) {
    return { message: 'Admin account is already verified.' };
  }

  if (!['pending_verification', 'active'].includes(user.status)) {
    throw createHttpError(403, 'Account not active');
  }

  const otp = await generateOtp({
    role: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
  });

  await authRepository.clearVerificationRecords({
    userRole: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await authRepository.insertVerificationRecord({
    userRole: 'admin',
    userId: user.id,
    purpose: 'registration_verification',
    channel: 'email',
    destination: user.email,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  await sendMail({
    to: user.email,
    subject: 'Your admin verification code',
    text: `Your admin verification code is ${otp}. It expires in 5 minutes.`,
  });

  await writeAuditLog({
    actorRole: 'admin',
    actorId: user.id,
    entityType: 'admin',
    entityId: user.id,
    action: 'admin_verification_code_resent',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'If that admin account exists, a verification code was sent.' };
}

async function resendDeoVerificationCode({ usernameOrEmail }, reqMeta) {
  const user = await authRepository.findDeoByUsernameOrEmail(usernameOrEmail);
  if (!user) {
    return { message: 'If that DEO account exists, a verification code was sent.' };
  }

  if (user.is_verified) {
    return { message: 'DEO account is already verified.' };
  }

  if (!['pending_verification', 'active'].includes(user.status)) {
    throw createHttpError(403, 'Account not active');
  }

  const otp = await generateOtp({
    role: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
    scope: 'email_verification',
  });

  await authRepository.clearVerificationRecords({
    userRole: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
  });

  await authRepository.insertVerificationRecord({
    userRole: 'deo',
    userId: user.id,
    purpose: 'registration_verification',
    channel: 'email',
    destination: user.email,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  await sendMail({
    to: user.email,
    subject: 'Your DEO verification code',
    text: `Your DEO verification code is ${otp}. It expires in 5 minutes.`,
  });

  await writeAuditLog({
    actorRole: 'deo',
    actorId: user.id,
    entityType: 'deo',
    entityId: user.id,
    action: 'deo_verification_code_resent',
    ipAddress: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'If that DEO account exists, a verification code was sent.' };
}

async function checkLockout({ role, userId, ip, email }) {
  let userAttempts = 0;
  let ipAttempts = 0;

  try {
    const userKey = `login:fail:${role}:${userId}`;
    const ipKey = `login:fail:ip:${role}:${ip}`;
    const [userVal, ipVal] = await Promise.all([
      redis.get(userKey),
      redis.get(ipKey),
    ]);
    userAttempts = Number(userVal || 0);
    ipAttempts = Number(ipVal || 0);
  } catch (err) {
    logger.warn('checkLockout: Redis unavailable, bypassing lockout check', { role, userId, error: err.message });
    await publishAuthEvent(redis, { event: 'lockout_check_bypassed', role, userId, ip });
    return;
  }

  if (userAttempts >= 10) {
    await publishAuthEvent(redis, { event: 'account_locked', role, userId, ip, reason: 'manual_unlock_required' });
    throw createHttpError(423, 'Account requires manual unlock');
  }
  if (userAttempts >= 5 || ipAttempts >= 5) {
    if (email) {
      await sendMail({
        to: email,
        subject: 'Account temporarily locked',
        text: 'Your account has been temporarily locked due to repeated failed login attempts.',
      });
    }
    await publishAuthEvent(redis, { event: 'account_locked', role, userId, ip, reason: 'temporary_lockout' });
    throw createHttpError(423, 'Account temporarily locked');
  }
}

async function recordLoginFailure({ role, userId, ip }) {
  const userKey = `login:fail:${role}:${userId}`;
  const ipKey = `login:fail:ip:${role}:${ip}`;

  try {
    const [userAttempts] = await Promise.all([
      redis.incr(userKey),
      redis.incr(ipKey),
    ]);
    await Promise.all([
      redis.expire(userKey, 900),
      redis.expire(ipKey, 900),
    ]);
    if (userAttempts >= 10) {
      await redis.set(`login:manual_unlock:${role}:${userId}`, '1', 'EX', 86400);
    }
  } catch (err) {
    logger.warn('recordLoginFailure: Redis unavailable, failure not cached', { role, userId, error: err.message });
  }

  // Always publish to stream — stream is the audit record when cache is unavailable
  await publishAuthEvent(redis, { event: 'login_failure', role, userId, ip });
}

async function clearLoginFailures({ role, userId, ip }) {
  try {
    await Promise.all([
      redis.del(`login:fail:${role}:${userId}`),
      redis.del(`login:fail:ip:${role}:${ip}`),
    ]);
  } catch (err) {
    logger.warn('clearLoginFailures: Redis unavailable', { role, userId, error: err.message });
  }
}

async function loginCitizen({ citizenId, password }, reqMeta) {
  const user = await authRepository.findCitizenByCitizenId(citizenId);
  const genericError = createHttpError(401, 'Invalid credentials');
  if (!user) {
    throw genericError;
  }
  await checkLockout({ role: 'citizen', userId: user.id, ip: reqMeta.ip, email: user.email });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid || !user.is_verified) {
    await recordLoginFailure({ role: 'citizen', userId: user.id, ip: reqMeta.ip });
    throw genericError;
  }
  await clearLoginFailures({ role: 'citizen', userId: user.id, ip: reqMeta.ip });
  await publishAuthEvent(redis, { event: 'login_success', role: 'citizen', userId: user.id, ip: reqMeta.ip });
  return issueSession('citizen', user);
}

async function startTwoFactorLogin(role, identifier, password, reqMeta) {
  const genericError = createHttpError(401, 'Invalid credentials');
  const finder = {
    admin: authRepository.findAdminByUsernameOrEmail,
    masteradmin: authRepository.findMasterAdminByUsernameOrEmail,
    deo: authRepository.findDeoByUsernameOrEmail,
    minister: authRepository.findMinisterByUsernameOrEmail,
  }[role];

  const user = await finder(identifier);
  if (!user) {
    throw genericError;
  }
  await checkLockout({ role, userId: user.id, ip: reqMeta.ip, email: user.email });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await recordLoginFailure({ role, userId: user.id, ip: reqMeta.ip });
    throw genericError;
  }

  if ((role === 'admin' || role === 'deo') && !user.is_verified) {
    throw createHttpError(403, 'Account verification required');
  }

  if (user.status !== 'active') {
    throw createHttpError(403, 'Account not active');
  }

  if (role === 'minister' || role === 'admin' || role === 'masteradmin' || role === 'deo') {
    await clearLoginFailures({ role, userId: user.id, ip: reqMeta.ip });
    await publishAuthEvent(redis, { event: 'login_success', role, userId: user.id, ip: reqMeta.ip });
    return issueSession(role, user);
  }
  throw createHttpError(500, 'Unsupported login flow');
}

async function forgotCitizenPassword({ aadhaarNumber, email, captchaToken }, reqMeta) {
  const captchaValid = await verifyCaptcha(captchaToken, reqMeta.ip);
  if (!captchaValid) {
    throw createHttpError(400, 'CAPTCHA verification failed');
  }

  const user = await authRepository.findCitizenByForgotPassword(sha256(aadhaarNumber), email);
  if (!user) {
    return { message: 'If that ID exists, instructions were sent.' };
  }

  const otp = await generateOtp({
    role: 'citizen',
    userId: user.id,
    purpose: 'password_reset',
    ip: reqMeta.ip,
  });

  if (user.email) {
    await sendMail({
      to: user.email,
      subject: 'Citizen Portal password reset OTP',
      text: `Your password reset OTP is ${otp}. It expires in 5 minutes.`,
    });
  }

  await sendSms({
    to: user.mobile_number,
    message: `Your password reset OTP is ${otp}. It expires in 5 minutes.`,
  });

  return { message: 'If that ID exists, instructions were sent.' };
}

async function resetCitizenPassword({ citizenId, otp, password }, reqMeta) {
  const user = await authRepository.findCitizenByCitizenId(citizenId);
  if (!user) {
    return { message: 'Password reset completed if the account exists.' };
  }

  const valid = await verifyOtp({
    role: 'citizen',
    userId: user.id,
    purpose: 'password_reset',
    ip: reqMeta.ip,
    otp,
  });
  if (!valid) {
    throw createHttpError(400, 'Invalid or expired OTP');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await authRepository.updatePassword('citizen', user.id, passwordHash);
  await redis.set(`password_changed:citizen:${user.id}`, String(Date.now()), 'EX', 86400);
  return { message: 'Password reset completed if the account exists.' };
}

async function refreshSession(refreshToken) {
  let payload;
  let role;

  // Fast path: read role from unverified decoded claims to skip brute-forcing all 5 role keys
  const allRoles = ['citizen', 'admin', 'masteradmin', 'deo', 'minister'];
  const decoded = jwt.decode(refreshToken);
  const candidates = (decoded?.role && allRoles.includes(decoded.role))
    ? [decoded.role]
    : allRoles;

  for (const candidate of candidates) {
    try {
      payload = verifyJwtByRole(candidate, refreshToken);
      if (payload.type === 'refresh') {
        role = candidate;
        break;
      }
    } catch (error) {
      continue;
    }
  }

  if (!payload || !role) {
    throw createHttpError(401, 'Unauthorized');
  }

  const stored = await authRepository.findActiveRefreshToken(payload.jti);
  if (!stored || stored.token_hash !== sha256(refreshToken)) {
    throw createHttpError(401, 'Unauthorized');
  }

  const user = await authRepository.findActiveUserById(role, payload.sub);
  if (!user) {
    throw createHttpError(401, 'Unauthorized');
  }

  const session = await issueSession(role, user);
  const newPayload = verifyJwtByRole(role, session.refreshToken);
  const replacement = await authRepository.findActiveRefreshToken(newPayload.jti);
  await authRepository.revokeRefreshToken(stored.id, replacement.id);
  return session;
}

async function logout(role, token, refreshToken) {
  const accessPayload = verifyJwtByRole(role, token);
  const ttl = Math.max(accessPayload.exp - Math.floor(Date.now() / 1000), 1);

  try {
    await redis.set(`revoked:jti:${accessPayload.jti}`, '1', 'EX', ttl);
  } catch (err) {
    logger.warn('logout: Redis unavailable, JTI not blacklisted', {
      role,
      jti: accessPayload.jti,
      error: err.message,
    });
    await publishAuthEvent(redis, {
      event: 'token_revoke_failed',
      role,
      userId: accessPayload.sub,
      reason: 'redis_down',
    });
  }

  if (refreshToken) {
    const refreshPayload = verifyJwtByRole(role, refreshToken);
    const stored = await authRepository.findActiveRefreshToken(refreshPayload.jti);
    if (stored) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  }

  return { message: 'Logged out successfully' };
}

module.exports = {
  registerCitizen,
  verifyCitizenRegistration,
  verifyAdminRegistration,
  verifyDeoRegistration,
  resendAdminVerificationCode,
  resendDeoVerificationCode,
  loginCitizen,
  startTwoFactorLogin,
  forgotCitizenPassword,
  resetCitizenPassword,
  refreshSession,
  logout,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd backend && npx jest tests/auth.service.resilience.test.js --no-coverage
```

Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
cd backend && git add modules/auth/auth.service.js tests/auth.service.resilience.test.js
git commit -m "fix: Redis resilience in auth service — fail-open lockout, safe logout, stream audit events, optimise refreshSession"
```

---

## Task 6: Full test suite + final commit

- [ ] **Step 1: Run the complete test suite**

```bash
cd backend && npx jest --no-coverage --runInBand
```

Expected: ALL tests pass, including the pre-existing `submission.service.test.js`.

If any test fails, read the error message and fix the specific assertion before proceeding. Common issues:
- Mock not reset between tests → add `jest.clearAllMocks()` in `beforeEach`
- Import path typo → verify path against the File Map at the top of this plan
- `publishAuthEvent` not mocked in a test file that imports `auth.service.js` → add `jest.mock('../utils/authStream', () => ({ publishAuthEvent: jest.fn() }))`

- [ ] **Step 2: Commit the plan document**

```bash
cd /mnt/d/hcmproject/HCM && git add docs/superpowers/plans/2026-04-02-auth-redis-resilience.md
git commit -m "docs: add auth Redis resilience implementation plan"
```

---

## Self-Review Checklist (completed inline)

- **Spec coverage:** All 8 issues from the spec are addressed: JTI fail-open ✓, password_changed check ✓, checkLockout wrap ✓, recordLoginFailure wrap ✓, clearLoginFailures wrap ✓, logout wrap ✓, OTP 503 ✓, rateLimiter warn ✓, refreshSession optimisation ✓, authStream ✓
- **Placeholders:** None — every step has complete code
- **Type consistency:** `publishAuthEvent(redis, { event, role, userId, ip, reason })` signature used identically in Task 1, Task 4, and Task 5. `authStream.js` export name `publishAuthEvent` matches all import sites.
