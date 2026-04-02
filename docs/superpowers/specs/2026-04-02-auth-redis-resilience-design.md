# Auth Redis Resilience + Stream Audit — Design Spec

**Date:** 2026-04-02
**Project:** Citizen-Minister Engagement Portal (HCM)
**Scope:** Fix Redis single-point-of-failure in auth layer; add Redis Stream audit trail for auth events.

---

## Problem Statement

Redis is used as a cache for six critical auth functions. None of them handle Redis failure gracefully:

| Broken path | Current behaviour on Redis down |
|---|---|
| `authenticate.js` JTI revocation check | Throws → outer catch → 401 for every authenticated request |
| `auth.service.js` `checkLockout` | Throws → login broken for all users |
| `auth.service.js` `recordLoginFailure` | Throws → failure not recorded, error propagates |
| `auth.service.js` `clearLoginFailures` | Throws → error propagates |
| `auth.service.js` `logout` JTI write | Throws → 500 on logout, JTI not blacklisted |
| `otpService.js` get/set | Throws → generic 500, confusing for users |

Additional security bug: `password_changed:citizen:{id}` is written on password reset but never checked in `authenticate.js` — stolen access tokens survive password resets.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| OTP fallback on Redis failure | Fail with 503 | OTPs are inherently stateful; a DB fallback adds schema changes for minimal gain |
| Token revocation on Redis failure | Fail-open | Tokens are 15-min RS256; DB user-active check still runs; industry standard |
| Redis Streams scope | Auth audit stream only | DLQ replay adds complexity with minimal security benefit given short token TTL |
| Implementation style | Surgical per-file fixes | Consistent with existing flat utility pattern in codebase |

---

## New File

### `backend/utils/authStream.js`

Single responsibility: publish structured auth events to the `auth:events` Redis Stream.

**Stream key:** `auth:events`
**Trim policy:** `MAXLEN ~ 50000` (approximate, applied on every write)
**Failure policy:** all errors swallowed silently — stream writes never propagate to callers

**Event schema (flat Redis Stream fields):**

| Field | Type | Description |
|---|---|---|
| `event` | string | Event type (see below) |
| `role` | string | `citizen`, `admin`, `deo`, `minister`, `masteradmin` |
| `userId` | string | Internal DB UUID |
| `ip` | string | Request IP (when available) |
| `reason` | string | Failure reason or bypass reason (optional) |
| `ts` | string | Unix ms timestamp |

**Event types:**

| Event | Published from |
|---|---|
| `login_success` | `loginCitizen`, `startTwoFactorLogin` |
| `login_failure` | `recordLoginFailure` |
| `account_locked` | `checkLockout` when threshold exceeded |
| `lockout_check_bypassed` | `checkLockout` on Redis error |
| `logout` | `logout` |
| `token_revoke_failed` | `logout` on Redis error for JTI write |
| `token_revoke_check_bypassed` | `authenticate.js` on Redis error |
| `otp_generated` | `generateOtp` |
| `otp_verified` | `verifyOtp` |

**Exported function:**
```js
publishAuthEvent(redis, { event, role, userId, ip, reason })
// Returns Promise<void>. Never throws.
```

---

## Modified Files

### `backend/middleware/authenticate.js`

**Change 1 — JTI revocation check (fail-open):**
```
try {
  revoked = await redis.get(`revoked:jti:${payload.jti}`)
} catch (err) {
  log warn + publishAuthEvent(token_revoke_check_bypassed)
  // continue — do NOT return 401
}
if (revoked) return 401
```

**Change 2 — `password_changed` check (NEW, fail-open):**
After the JTI check, add:
```
try {
  changedAt = await redis.get(`password_changed:${role}:${userId}`)
  if (changedAt && Number(changedAt) > payload.iat * 1000) return 401
} catch (err) {
  // fail-open, log warn
}
```

**No other changes.** DB user-active check is unchanged.

---

### `backend/modules/auth/auth.service.js`

**`checkLockout`:**
- Wrap both `redis.get` calls in try/catch
- On Redis error: `logger.warn` + `publishAuthEvent(lockout_check_bypassed)` + return (allow login)

**`recordLoginFailure`:**
- Wrap `redis.incr/expire` calls in try/catch
- On Redis error: `logger.warn` + `publishAuthEvent(login_failure, reason: 'redis_down')` — stream becomes the audit record when cache is unavailable

**`clearLoginFailures`:**
- Wrap `redis.del` calls in try/catch
- On Redis error: `logger.warn`, continue silently

**`logout`:**
- Wrap `redis.set` JTI write in try/catch
- On Redis error: `publishAuthEvent(token_revoke_failed)` + still return `{ message: 'Logged out successfully' }` — DB refresh token revocation already completed

**`loginCitizen` / `startTwoFactorLogin`:**
- After successful login: `publishAuthEvent(login_success)`

**`refreshSession` optimisation:**
- Replace the 5-role brute-force loop with `jwt.decode(refreshToken)` to read role from unverified claims, then verify with that single role's key
- Falls back to full loop if decoded role is missing or invalid

---

### `backend/utils/otpService.js`

**`generateOtp`:**
```
try {
  await redis.set(key, hash, 'EX', 300)
} catch (err) {
  throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly')
}
```

**`verifyOtp`:**
```
try {
  hash = await redis.get(key)
} catch (err) {
  throw createHttpError(503, 'OTP service temporarily unavailable, please try again shortly')
}
```

Requires adding `http-errors` import to `otpService.js`.

---

### `backend/middleware/rateLimiter.js`

In the catch block, before `next()`:
```js
logger.warn('Rate limiter Redis unavailable, bypassing', { key, error: error.message })
```

Requires adding `logger` import.

---

## What Is NOT Changed

- No DB schema changes
- No new npm dependencies
- No changes to BullMQ workers, WebSocket layer, or monitoring collectors
- `idempotency.js` already handles Redis failure correctly — no changes needed
- Complaints/meetings controllers already pass `idempotencyKey` correctly — confirmed in review

---

## Testing

The existing `backend/tests/submission.service.test.js` tests idempotency bypass.

New tests to add in `backend/tests/auth.resilience.test.js`:
- `authenticate` fails-open when Redis throws on JTI check
- `authenticate` returns 401 when `password_changed` key is newer than token `iat`
- `checkLockout` allows login when Redis throws
- `logout` returns success when Redis throws on JTI write
- `generateOtp` throws 503 when Redis throws
- `verifyOtp` throws 503 when Redis throws
- `refreshSession` uses decoded role, not brute-force loop

---

## Risk Assessment

| Change | Risk | Mitigation |
|---|---|---|
| Fail-open JTI check | Revoked token usable during Redis outage (max 15 min window) | Tokens are short-lived RS256; DB account-active check still runs |
| Fail-open lockout | Brute-force window opens during Redis outage | Rate limiter still applies (also fails-open, but independent path); stream records every attempt |
| OTP 503 | User registration blocked during Redis outage | Clear user-facing message; Redis restores quickly; acceptable trade-off vs DB fallback complexity |
