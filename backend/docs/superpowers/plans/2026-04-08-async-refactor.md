# Async Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix dead BullMQ workers, move all email/SMS/notification side-effects out of the HTTP request cycle, add WebSocket heartbeats, harden Redis security checks, and add DB pool safety — without changing any public API contracts.

**Architecture:** The main Express server continues to handle HTTP requests synchronously for DB writes and returns responses immediately. All email, SMS, and notification fan-out is enqueued to BullMQ. A separate `worker:jobs` process runs the BullMQ workers. The existing `worker:auth-stream` process is unchanged.

**Tech Stack:** Node.js, Express, BullMQ v5, ioredis, PostgreSQL (pg pool), ws WebSocket, nodemailer, Jest + supertest

---

## 🔍 Findings (Mapped to Code)

| Issue | Location | Line(s) |
|-------|----------|---------|
| Email sent sync during citizen registration | `auth.service.js` | 199–209 |
| Email/SMS sent sync during forgot password | `auth.service.js` | 770–777 |
| Email sent sync for lockout notification | `auth.service.js` | 553–558 |
| Email sent sync for DEO resend verification | `auth.service.js` | 490–494 |
| Email sent sync for admin/DEO creation | `masteradmin.service.js` | 38–42 |
| Email/SMS sent sync in notification delivery | `notifications.service.js` | 158–191 |
| BullMQ workers defined but processors are no-ops | `workers/jobRunner.js` | 22–34 |
| BullMQ queues never created anywhere (no producer) | entire codebase | — |
| No ping/pong heartbeat on WebSocket connections | `realtime/wsServer.js` | 34–86 |
| JTI revocation check fails-open for ALL roles | `middleware/authenticate.js` | 59–89 |
| DB pool max=10 per cluster worker → N×10 connections | `config/database.js` | 6 |
| Rate limiter has no in-memory fallback | `middleware/rateLimiter.js` | 26–29 |
| JWT accepted from URL query param (`?token=`) in WS | `realtime/wsServer.js` | 14–16 |
| `process.pid` exposed via health/metrics endpoint | (check `app.js`) | — |
| Missing pagination on meetings list | `meetings.service.js` | 125–127 |

---

## 🗂️ File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/queues/index.js` | **CREATE** | Shared BullMQ Queue producers (email, sms) |
| `backend/workers/jobRunner.js` | **MODIFY** | Real processors for email, sms workers |
| `backend/package.json` | **MODIFY** | Add `worker:jobs` script |
| `backend/modules/notifications/notifications.service.js` | **MODIFY** | Queue email/SMS in `deliverOutOfBandChannels` |
| `backend/modules/auth/auth.service.js` | **MODIFY** | Queue OTP emails/SMS; remove SMTP-tied rollback |
| `backend/modules/masteradmin/masteradmin.service.js` | **MODIFY** | Queue verification emails |
| `backend/realtime/wsServer.js` | **MODIFY** | Add ping/pong heartbeat; remove URL token |
| `backend/middleware/authenticate.js` | **MODIFY** | Fail CLOSED for JTI revocation on privileged roles |
| `backend/config/database.js` | **MODIFY** | Honor `POOL_MAX_PER_WORKER` env var |
| `backend/middleware/rateLimiter.js` | **MODIFY** | Add in-memory sliding window fallback |
| `backend/modules/meetings/meetings.service.js` | **MODIFY** | Add pagination to `getCitizenMeetings` |
| `backend/modules/meetings/meetings.repository.js` | **MODIFY** | Accept limit/offset in `getCitizenMeetings` |

---

## ⚠️ Behavior Change Notes

**Registration / OTP emails (Task 5):**
Currently: if SMTP fails during registration → citizen record is deleted → 502 returned.
After: citizen record is created, OTP is stored in Redis, email is enqueued. If worker fails after all retries → user must request "resend verification". This is an intentional trade-off per the spec ("move ALL side effects to BullMQ"). The resend endpoints already exist.

**Admin/DEO creation emails (Task 6):**
Same pattern: account is created, email is enqueued. If worker fails → master admin uses "resend verification code" endpoint.

---

## Task 1: Create Shared BullMQ Queue Producers

**Files:**
- Create: `backend/queues/index.js`

BullMQ queues (producers) need their own Redis connection with `maxRetriesPerRequest: null` — they must NOT share the application's main Redis client.

- [ ] **Step 1: Write the file**

```js
// backend/queues/index.js
// WHY: Central producer module so any service can enqueue jobs without creating
// new Queue/connection instances per call. One connection per queue type.
'use strict';

const { Queue } = require('bullmq');
const { createRedisClient } = require('../config/redis');

// BullMQ requires maxRetriesPerRequest: null on its connection — it manages
// retries itself. We must NOT share the app's main redis client here.
function makeBullConnection() {
  return createRedisClient({ maxRetriesPerRequest: null, enableReadyCheck: false });
}

const DEFAULT_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s, 16s
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 500 },
};

// Producer queues — used by services to enqueue work.
// Workers (in jobRunner.js) consume from these same named queues.
const emailQueue = new Queue('email', {
  connection: makeBullConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

const smsQueue = new Queue('sms', {
  connection: makeBullConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

module.exports = { emailQueue, smsQueue, DEFAULT_JOB_OPTIONS };
```

- [ ] **Step 2: Verify syntax**

```bash
cd /mnt/d/hcmproject/HCM/backend && node -e "require('./queues/index'); console.log('OK')"
```
Expected: `OK` (or a Redis connection error if Redis isn't running — that's fine; the module loads without crash)

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add queues/index.js
git commit -m "feat: add shared BullMQ queue producer module (email, sms)"
```

---

## Task 2: Fix jobRunner.js — Implement Real Worker Processors

**Files:**
- Modify: `backend/workers/jobRunner.js`

The existing workers only log. They need to call `sendMail()` and `sendSms()`.

- [ ] **Step 1: Read current file** (already done in analysis)

- [ ] **Step 2: Replace `workers/jobRunner.js` with real processors**

```js
// backend/workers/jobRunner.js
// WHY: Previously workers were no-ops — jobs were never enqueued either.
// This makes workers actually process email and SMS jobs from BullMQ queues.
'use strict';

const { Worker } = require('bullmq');
const { createRedisClient } = require('../config/redis');
const { sendMail } = require('../utils/mailer');
const { sendSms } = require('../utils/smsService');
const logger = require('../utils/logger');

// Each worker needs its own dedicated connection with maxRetriesPerRequest: null.
// WHY: BullMQ controls its own retry/blocking loop; sharing the app redis client
// causes "maxRetriesPerRequest is not null" errors under load.
function makeBullConnection() {
  return createRedisClient({ maxRetriesPerRequest: null, enableReadyCheck: false });
}

const workerOptions = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 1000 },
};

// Email worker — processes jobs enqueued by emailQueue.add('sendEmail', payload)
// Job payload: { to, subject, text, html? }
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, text, html } = job.data;
    logger.info('Processing email job', { jobId: job.id, to, subject });
    await sendMail({ to, subject, text, html });
    logger.info('Email job completed', { jobId: job.id });
  },
  { concurrency: 5, connection: makeBullConnection(), ...workerOptions }
);

// SMS worker — processes jobs enqueued by smsQueue.add('sendSms', payload)
// Job payload: { to, message }
const smsWorker = new Worker(
  'sms',
  async (job) => {
    const { to, message } = job.data;
    logger.info('Processing SMS job', { jobId: job.id });
    await sendSms({ to, message });
    logger.info('SMS job completed', { jobId: job.id });
  },
  { concurrency: 5, connection: makeBullConnection(), ...workerOptions }
);

const workers = [emailWorker, smsWorker];

for (const worker of workers) {
  worker.on('failed', (job, error) => {
    logger.error('BullMQ worker job failed', {
      jobId: job?.id,
      queue: job?.queueName,
      attemptsMade: job?.attemptsMade,
      error: error?.message,
    });
  });

  worker.on('error', (error) => {
    logger.error('BullMQ worker error', { error: error?.message });
  });
}

logger.info('BullMQ workers started', { queues: ['email', 'sms'] });

async function shutdown() {
  logger.info('Shutting down BullMQ workers...');
  await Promise.allSettled(workers.map((w) => w.close()));
  logger.info('BullMQ workers shut down');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

- [ ] **Step 3: Verify syntax**

```bash
cd /mnt/d/hcmproject/HCM/backend && node -e "require('./workers/jobRunner'); console.log('OK')" 2>&1 | head -5
```
Expected: logs startup message and `OK`, no syntax errors.

- [ ] **Step 4: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add workers/jobRunner.js
git commit -m "fix: implement real email/SMS processors in BullMQ workers"
```

---

## Task 3: Add worker:jobs Script to package.json

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Add the script**

In `backend/package.json`, inside `"scripts"`, add after the `worker:auth-stream` line:

```json
"worker:jobs": "node workers/jobRunner.js",
```

Full scripts block after change:
```json
"scripts": {
  "dev": "NODE_ENV=development node server.js",
  "start": "NODE_ENV=production node server.js",
  "worker:auth-stream": "node workers/authStreamWorker.js",
  "worker:jobs": "node workers/jobRunner.js",
  "auth-stream:info": "node scripts/authStreamAdmin.js info",
  "auth-stream:pending": "node scripts/authStreamAdmin.js pending",
  "auth-stream:replay": "node scripts/authStreamAdmin.js replay",
  "auth-stream:requeue-dlq": "node scripts/authStreamAdmin.js requeue-dlq",
  "migrate": "node db/postgres/seeds/seed.js migrate",
  "seed": "node db/postgres/seeds/seed.js seed",
  "test": "jest --runInBand",
  "lint:security": "npm audit --audit-level=high"
}
```

- [ ] **Step 2: Verify**

```bash
cd /mnt/d/hcmproject/HCM/backend && node -e "const p=require('./package.json'); console.log(p.scripts['worker:jobs'])"
```
Expected: `node workers/jobRunner.js`

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add package.json
git commit -m "feat: add worker:jobs npm script to start BullMQ workers"
```

---

## Task 4: Refactor notifications.service.js — Queue Email/SMS Delivery

**Files:**
- Modify: `backend/modules/notifications/notifications.service.js`

Replace the synchronous `sendMail` / `sendSms` calls in `deliverOutOfBandChannels` with queue jobs.
The DB write and WebSocket publish remain synchronous (they're fast).

- [ ] **Step 1: Add queue imports at top of file**

Find the current imports block (lines 1–11) and add the queue import:

```js
// ADD after line 6 (after logger require):
const { emailQueue, smsQueue } = require('../../queues/index');
```

Complete new imports block (lines 1–12):
```js
const createHttpError = require('http-errors');
const authRepository = require('../auth/auth.repository');
const notificationsRepository = require('./notifications.repository');
const { sendMail } = require('../../utils/mailer');   // kept — email worker still needs it
const { sendSms } = require('../../utils/smsService'); // kept — sms worker still needs it
const logger = require('../../utils/logger');
// WHY: Email/SMS delivery is now async via BullMQ to unblock the request cycle.
const { emailQueue, smsQueue } = require('../../queues/index');
const {
  publishMeetingStatusUpdate,
  publishComplaintStatusUpdate,
  publishNotificationCreated,
} = require('../../realtime/wsPublisher');
```

Wait — `sendMail`/`sendSms` are no longer called here. Remove them from the import:

```js
const createHttpError = require('http-errors');
const authRepository = require('../auth/auth.repository');
const notificationsRepository = require('./notifications.repository');
const logger = require('../../utils/logger');
// WHY: Email/SMS delivery is enqueued to BullMQ workers so the request cycle
// is not blocked by SMTP/SMS latency (up to 10s per send).
const { emailQueue, smsQueue } = require('../../queues/index');
const {
  publishMeetingStatusUpdate,
  publishComplaintStatusUpdate,
  publishNotificationCreated,
} = require('../../realtime/wsPublisher');
```

- [ ] **Step 2: Replace `deliverOutOfBandChannels` function**

Old function (lines 147–192):
```js
async function deliverOutOfBandChannels(recipientRole, recipientId, preferences, notification) {
  if (preferences.digestFrequency !== 'realtime') {
    return;
  }

  const user = await authRepository.findUserById(recipientRole, recipientId);
  if (!user) {
    return;
  }

  if (preferences.channels.email && user.email) {
    try {
      await sendMail({
        to: user.email,
        subject: notification.title,
        text: notification.body,
      });
    } catch (error) {
      logger.warn('Notification email delivery failed', { ... });
    }
  }

  const phone = user.mobile_number || user.phone_number;
  if (preferences.channels.sms && phone) {
    try {
      await sendSms({ to: phone, message: notification.body });
    } catch (error) {
      logger.warn('Notification SMS delivery failed', { ... });
    }
  }
}
```

New function:
```js
async function deliverOutOfBandChannels(recipientRole, recipientId, preferences, notification) {
  // WHY: Skip entirely for digest users — their digest jobs run separately.
  if (preferences.digestFrequency !== 'realtime') {
    return;
  }

  const user = await authRepository.findUserById(recipientRole, recipientId);
  if (!user) {
    return;
  }

  // WHY: Enqueue rather than await directly. SMTP timeouts up to 10s would block
  // the HTTP response for every notification-triggering action. BullMQ retries
  // (4 attempts, exponential backoff) handle transient SMTP failures.
  if (preferences.channels.email && user.email) {
    emailQueue.add('sendEmail', {
      to: user.email,
      subject: notification.title,
      text: notification.body,
    }).catch((err) => {
      logger.warn('Failed to enqueue notification email job', {
        recipientRole,
        recipientId,
        notificationId: notification.id,
        error: err.message,
      });
    });
  }

  const phone = user.mobile_number || user.phone_number;
  if (preferences.channels.sms && phone) {
    smsQueue.add('sendSms', {
      to: phone,
      message: notification.body,
    }).catch((err) => {
      logger.warn('Failed to enqueue notification SMS job', {
        recipientRole,
        recipientId,
        notificationId: notification.id,
        error: err.message,
      });
    });
  }
}
```

Note: we use `.catch()` instead of `await` so queue failures don't propagate up. The notification DB record is already created by this point.

- [ ] **Step 3: Run existing notification resilience test**

```bash
cd /mnt/d/hcmproject/HCM/backend && npx jest tests/notifications.service.resilience.test.js --no-coverage 2>&1 | tail -20
```
Expected: All tests pass (or same results as before — do not introduce regressions).

- [ ] **Step 4: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add modules/notifications/notifications.service.js
git commit -m "fix: queue email/SMS delivery in notifications service (unblock request cycle)"
```

---

## Task 5: Refactor auth.service.js — Queue OTP Emails/SMS

**Files:**
- Modify: `backend/modules/auth/auth.service.js`

Three places need changes:
1. `registerCitizen()` — OTP email/SMS dispatch + rollback
2. `forgotCitizenPassword()` — password reset OTP email/SMS
3. `checkLockout()` — lockout notification email
4. `resendAdminVerificationCode()` — admin resend
5. `resendDeoVerificationCode()` — DEO resend

**⚠️ Behavior change for registerCitizen:** The current rollback (delete pending citizen on SMTP failure) is removed. The OTP is already stored in Redis. If the email job fails all retries, the user requests a resend. This is the standard modern pattern.

- [ ] **Step 1: Add queue imports at top of auth.service.js**

After line 10 (`const { sendSms } = require('../../utils/smsService');`), add:

```js
// WHY: OTP and transactional emails are enqueued so SMTP latency doesn't block
// auth endpoints. OTP is stored in Redis before enqueue — delivery failure is
// recoverable via resend endpoints.
const { emailQueue, smsQueue } = require('../../queues/index');
```

Remove the `sendMail` and `sendSms` imports (they are only used in this file through the queue now):
- Remove: `const { sendMail } = require('../../utils/mailer');`
- Remove: `const { sendSms } = require('../../utils/smsService');`

- [ ] **Step 2: Refactor `registerCitizen` — remove SMTP rollback, enqueue instead**

Find the block starting at line 197 (`if (payload.preferredVerificationChannel === 'email') {`) inside the inner try/catch.

Replace the entire inner try/catch block (lines 170–230):

```js
    try {
      stage = 'generate-otp';
      const otp = await generateOtp({
        role: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
        ip: reqMeta.ip,
        requestId: reqMeta.requestId,
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

      // WHY: OTP is now stored in Redis/DB — dispatch is best-effort via queue.
      // If delivery fails after retries, the user can request a resend.
      // We no longer rollback the citizen record on SMTP failure (resend exists).
      if (payload.preferredVerificationChannel === 'email') {
        stage = 'enqueue-email';
        emailQueue.add('sendEmail', {
          to: payload.email,
          subject: 'Verify your Citizen Portal account',
          text: `Your OTP is ${otp}. It expires in 5 minutes.`,
        }).catch((err) => logger.warn('Failed to enqueue citizen OTP email', {
          citizenId: citizen.id,
          error: err.message,
        }));
      } else {
        stage = 'enqueue-sms';
        smsQueue.add('sendSms', {
          to: payload.mobileNumber,
          message: `Your OTP is ${otp}. It expires in 5 minutes.`,
        }).catch((err) => logger.warn('Failed to enqueue citizen OTP SMS', {
          citizenId: citizen.id,
          error: err.message,
        }));
      }
    } catch (error) {
      // Only OTP generation or DB record errors reach here now (not SMTP errors).
      stage = `${stage}-rollback`;
      await authRepository.clearVerificationRecords({
        userRole: 'citizen',
        userId: citizen.id,
        purpose: 'registration_verification',
      });
      if (createdNewCitizen) {
        await citizenRepository.deletePendingCitizenById(citizen.id);
      }
      logger.error('Citizen registration OTP setup failed', {
        stage,
        citizenId: citizen.id,
        error,
      });
      throw createHttpError(502, 'Unable to send citizen verification code');
    }
```

- [ ] **Step 3: Refactor `forgotCitizenPassword` — enqueue email/SMS**

Find lines 769–780:
```js
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
```

Replace with:
```js
  // WHY: OTP already stored in Redis — dispatch is fire-and-queue.
  if (user.email) {
    emailQueue.add('sendEmail', {
      to: user.email,
      subject: 'Citizen Portal password reset OTP',
      text: `Your password reset OTP is ${otp}. It expires in 5 minutes.`,
    }).catch((err) => logger.warn('Failed to enqueue password reset email', {
      userId: user.id,
      error: err.message,
    }));
  }

  smsQueue.add('sendSms', {
    to: user.mobile_number,
    message: `Your password reset OTP is ${otp}. It expires in 5 minutes.`,
  }).catch((err) => logger.warn('Failed to enqueue password reset SMS', {
    userId: user.id,
    error: err.message,
  }));
```

- [ ] **Step 4: Refactor `checkLockout` — enqueue lockout notification email**

Find lines 553–558 (inside `checkLockout`):
```js
          await sendMail({
            to: email,
            subject: 'Account temporarily locked',
            text: 'Your account has been temporarily locked due to repeated failed login attempts.',
          });
```

Replace with:
```js
          // WHY: Lockout email is informational — queue for async delivery.
          await emailQueue.add('sendEmail', {
            to: email,
            subject: 'Account temporarily locked',
            text: 'Your account has been temporarily locked due to repeated failed login attempts.',
          });
```

Note: this one keeps `await` intentionally because it's inside a try/catch that already suppresses errors. But actually for consistency we should not await here either — let it be fire-and-forget:

```js
          emailQueue.add('sendEmail', {
            to: email,
            subject: 'Account temporarily locked',
            text: 'Your account has been temporarily locked due to repeated failed login attempts.',
          }).catch((err) => logger.warn('Failed to enqueue lockout email', { role, userId, error: err.message }));
```

- [ ] **Step 5: Refactor `resendAdminVerificationCode` — enqueue email**

Find the block where `await sendMail(...)` is called (around line 430):
```js
  await sendMail({
    to: user.email,
    subject: 'Your admin verification code',
    text: `Your admin verification code is ${otp}. It expires in 5 minutes.`,
  });
```

Replace with:
```js
  // WHY: OTP already in Redis — queue delivery so this endpoint responds fast.
  emailQueue.add('sendEmail', {
    to: user.email,
    subject: 'Your admin verification code',
    text: `Your admin verification code is ${otp}. It expires in 5 minutes.`,
  }).catch((err) => logger.warn('Failed to enqueue admin verification email', {
    userId: user.id,
    error: err.message,
  }));
```

- [ ] **Step 6: Refactor `resendDeoVerificationCode` — enqueue email**

Find lines 490–494:
```js
  await sendMail({
    to: user.email,
    subject: 'Your DEO verification code',
    text: `Your DEO verification code is ${otp}. It expires in 5 minutes.`,
  });
```

Replace with:
```js
  // WHY: OTP already in Redis — queue delivery so this endpoint responds fast.
  emailQueue.add('sendEmail', {
    to: user.email,
    subject: 'Your DEO verification code',
    text: `Your DEO verification code is ${otp}. It expires in 5 minutes.`,
  }).catch((err) => logger.warn('Failed to enqueue DEO verification email', {
    userId: user.id,
    error: err.message,
  }));
```

- [ ] **Step 7: Run auth resilience tests**

```bash
cd /mnt/d/hcmproject/HCM/backend && npx jest tests/auth.service.resilience.test.js tests/auth.test.js --no-coverage 2>&1 | tail -30
```
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add modules/auth/auth.service.js
git commit -m "fix: queue OTP emails/SMS in auth service (unblock registration, forgot-password)"
```

---

## Task 6: Refactor masteradmin.service.js — Queue Verification Emails

**Files:**
- Modify: `backend/modules/masteradmin/masteradmin.service.js`

- [ ] **Step 1: Add queue import**

After line 5 (`const { sendMail } = require('../../utils/mailer');`), replace the import:

Remove:
```js
const { sendMail } = require('../../utils/mailer');
```

Add:
```js
// WHY: Verification email enqueued so admin/DEO creation endpoints respond fast.
const { emailQueue } = require('../../queues/index');
const logger = require('../../utils/logger');
```

Note: `logger` may already be imported — check the file. If not present, add it.

- [ ] **Step 2: Refactor `sendVerificationCode` function**

Old (lines 15–43):
```js
async function sendVerificationCode({ role, userId, email }) {
  const otp = await generateOtp({ ... });
  await authRepository.clearVerificationRecords({ ... });
  await authRepository.insertVerificationRecord({ ... });
  await sendMail({
    to: email,
    subject: `Your ${role === 'admin' ? 'admin' : 'DEO'} verification code`,
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
  });
}
```

New:
```js
async function sendVerificationCode({ role, userId, email }) {
  const otp = await generateOtp({
    role,
    userId,
    purpose: 'registration_verification',
    scope: 'email_verification',
  });

  await authRepository.clearVerificationRecords({
    userRole: role,
    userId,
    purpose: 'registration_verification',
  });

  await authRepository.insertVerificationRecord({
    userRole: role,
    userId,
    purpose: 'registration_verification',
    channel: 'email',
    destination: email,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  // WHY: OTP is stored before enqueue — email failure is recoverable via resend.
  // Enqueue non-blocking so account creation returns immediately.
  emailQueue.add('sendEmail', {
    to: email,
    subject: `Your ${role === 'admin' ? 'admin' : 'DEO'} verification code`,
    text: `Your verification code is ${otp}. It expires in 5 minutes.`,
  }).catch((err) => logger.warn('Failed to enqueue verification email', {
    role,
    userId,
    error: err.message,
  }));
}
```

Also update `createAdmin` and `createDeo` — the try/catch around `sendVerificationCode` that rolls back on failure is now only for OTP/DB errors (not SMTP). The rollback logic can stay — it protects against OTP generation failures, which are still possible.

- [ ] **Step 3: Run tests**

```bash
cd /mnt/d/hcmproject/HCM/backend && npx jest tests/admin.test.js --no-coverage 2>&1 | tail -20
```
Expected: Pass.

- [ ] **Step 4: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add modules/masteradmin/masteradmin.service.js
git commit -m "fix: queue admin/DEO verification emails in masteradmin service"
```

---

## Task 7: Fix WebSocket — Add Ping/Pong Heartbeat

**Files:**
- Modify: `backend/realtime/wsServer.js`

Without heartbeats, dead connections accumulate in memory indefinitely. The `ws` library supports `ping`/`pong` natively.

- [ ] **Step 1: Rewrite wsServer.js with heartbeat + URL token removal**

Replace the entire file:

```js
// backend/realtime/wsServer.js
'use strict';

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { getRoleConfig } = require('../config/jwt');
const { buildChannel } = require('./wsPublisher');
const logger = require('../utils/logger');

// WHY: Only accept tokens from Authorization header — URL query tokens are logged
// by proxies, CDNs, and access logs which is a security risk.
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  // Fallback: allow query param ONLY in non-production for tooling convenience.
  // REMOVE this fallback once all WS clients send the Authorization header.
  if (process.env.NODE_ENV !== 'production') {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get('token');
  }
  return null;
}

// How often to ping clients. Dead connections that miss 2 consecutive pings
// are terminated. 30s ping + 35s timeout = ~65s max zombie lifetime.
const HEARTBEAT_INTERVAL_MS = 30_000;

function initializeWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const subscriber = redis.duplicate();
  const socketsByChannel = new Map();
  const subscribedChannels = new Set();
  const supportedRoles = new Set(['citizen', 'admin', 'masteradmin', 'minister', 'deo']);

  subscriber.on('message', (channel, rawMessage) => {
    const sockets = socketsByChannel.get(channel) || new Set();
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(rawMessage);
      }
    }
  });

  // WHY: Heartbeat interval pings all connected clients. Any client that
  // hasn't responded to the previous ping (isAlive === false) is terminated.
  // This prevents zombie connections from accumulating after network failures.
  const heartbeatTimer = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate(); // forcefully close zombie connection
        return;
      }
      client.isAlive = false;
      client.ping(); // ws library sends a ping frame; client sends pong automatically
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Stop the interval when the server closes (prevents memory leaks in tests)
  wss.on('close', () => clearInterval(heartbeatTimer));

  wss.on('connection', async (ws, req) => {
    try {
      const token = extractToken(req);
      if (!token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const decoded = jwt.decode(token);
      const role = decoded?.role;
      if (!supportedRoles.has(role)) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const config = getRoleConfig(role);
      const payload = jwt.verify(token, config.publicKey, {
        algorithms: ['RS256'],
        audience: config.audience,
        issuer: config.issuer,
      });

      const recipientId = payload.sub;
      const channel = buildChannel(role, recipientId);

      if (!subscribedChannels.has(channel)) {
        await subscriber.subscribe(channel);
        subscribedChannels.add(channel);
      }

      if (!socketsByChannel.has(channel)) {
        socketsByChannel.set(channel, new Set());
      }
      socketsByChannel.get(channel).add(ws);
      redis.incr('metrics:ws:active').catch(() => {});

      // WHY: Mark connection alive on connect and on each pong response.
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('close', async () => {
        const sockets = socketsByChannel.get(channel);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            socketsByChannel.delete(channel);
            // WHY: Unsubscribe from Redis channel when last client on this
            // channel disconnects — prevents Redis subscription leak.
            await subscriber.unsubscribe(channel).catch(() => {});
            subscribedChannels.delete(channel);
          }
        }
        redis.decr('metrics:ws:active').catch(() => {});
      });
    } catch (error) {
      logger.error('WebSocket authentication failed', { error });
      ws.close(4001, 'Unauthorized');
    }
  });

  async function shutdown() {
    clearInterval(heartbeatTimer);
    for (const client of wss.clients) {
      client.close();
    }
    await subscriber.quit().catch(() => {});
  }

  return { shutdown };
}

module.exports = { initializeWebSocket };
```

- [ ] **Step 2: Verify syntax**

```bash
cd /mnt/d/hcmproject/HCM/backend && node -e "require('./realtime/wsServer'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add realtime/wsServer.js
git commit -m "fix: add WebSocket ping/pong heartbeat to prevent zombie connections"
```

---

## Task 8: Harden authenticate.js — Fail CLOSED for Privileged Roles

**Files:**
- Modify: `backend/middleware/authenticate.js`

Currently the JTI revocation check fails-open for ALL roles. Admin/masteradmin/minister/deo routes should fail-CLOSED (deny access) when Redis is unavailable — a revoked admin token should never slip through.

Citizen routes can remain fail-open (less sensitive).

- [ ] **Step 1: Define privileged roles constant and update the catch block**

Find the JTI revocation catch block (lines 75–89):

```js
      } catch (err) {
        logger.warn('authenticate: Redis JTI check unavailable, continuing (fail-open)', {
          jti: payload.jti,
          expectedRole: matchedRole,
          error: err.message,
        });
        await publishAuthEvent(redis, {
          event: 'token_revoke_check_bypassed',
          role: matchedRole,
          userId: payload.sub,
          ip: req.ip,
          reason: 'redis_down',
          requestId: getRequestId(req),
        });
      }
```

Replace with:

```js
      } catch (err) {
        // WHY: Privileged roles (admin, masteradmin, minister, deo) must fail CLOSED
        // when Redis is unavailable — a manually revoked admin token must not slip
        // through. Citizens fail-open since their tokens are lower risk.
        const PRIVILEGED_ROLES = new Set(['admin', 'masteradmin', 'minister', 'deo']);
        if (PRIVILEGED_ROLES.has(matchedRole)) {
          logger.error('authenticate: Redis unavailable for JTI check on privileged role — denying (fail-closed)', {
            jti: payload.jti,
            role: matchedRole,
            userId: payload.sub,
            error: err.message,
          });
          return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
        }

        logger.warn('authenticate: Redis JTI check unavailable for citizen, continuing (fail-open)', {
          jti: payload.jti,
          expectedRole: matchedRole,
          error: err.message,
        });
        await publishAuthEvent(redis, {
          event: 'token_revoke_check_bypassed',
          role: matchedRole,
          userId: payload.sub,
          ip: req.ip,
          reason: 'redis_down',
          requestId: getRequestId(req),
        });
      }
```

- [ ] **Step 2: Run auth middleware tests**

```bash
cd /mnt/d/hcmproject/HCM/backend && npx jest tests/authenticate.test.js tests/authenticate.resilience.test.js --no-coverage 2>&1 | tail -30
```
Expected: Pass. If any test asserts fail-open behavior for admin roles, update the test to expect 503.

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add middleware/authenticate.js
git commit -m "fix: fail CLOSED on Redis error for admin/masteradmin/minister/deo JTI revocation"
```

---

## Task 9: Fix DB Connection Pool — POOL_MAX_PER_WORKER Support

**Files:**
- Modify: `backend/config/database.js`

With Node.js cluster (N workers × max: 10 connections each = 40+ connections on a 4-core machine). PostgreSQL default max_connections is 100. This headroom shrinks fast.

- [ ] **Step 1: Update database.js**

```js
// backend/config/database.js
const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// WHY: With cluster mode, each worker process creates its own pool. Keeping
// max at 10 per worker means N_CPUS × 10 total connections. Use
// POOL_MAX_PER_WORKER env var to tune this. Default 5 per worker keeps total
// connections under 40 on an 8-core machine (8 × 5 = 40, well under PG's 100).
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
```

- [ ] **Step 2: Verify syntax**

```bash
cd /mnt/d/hcmproject/HCM/backend && node -e "require('./config/database'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add config/database.js
git commit -m "fix: add POOL_MAX_PER_WORKER support to reduce cluster connection explosion"
```

---

## Task 10: Fix Rate Limiter — In-Memory Fallback

**Files:**
- Modify: `backend/middleware/rateLimiter.js`

When Redis is unavailable, currently the rate limiter logs and passes all requests. The spec requires an in-memory fallback to keep limiting.

- [ ] **Step 1: Rewrite rateLimiter.js with in-memory fallback**

```js
// backend/middleware/rateLimiter.js
'use strict';

const redis = require('../config/redis');
const logger = require('../utils/logger');

// WHY: In-memory fallback so rate limiting continues when Redis is unavailable.
// Uses a simple sliding-window counter per key. Resets every `windowSeconds`.
// This is per-process (not cross-cluster) but better than unlimited access.
const inMemoryCounters = new Map(); // key -> { count, resetAt }

function inMemoryIncr(key, windowSeconds) {
  const now = Date.now();
  const entry = inMemoryCounters.get(key);
  if (!entry || now >= entry.resetAt) {
    inMemoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

// Prevent unbounded memory growth: prune expired entries periodically.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryCounters) {
    if (now >= entry.resetAt) {
      inMemoryCounters.delete(key);
    }
  }
}, 60_000);

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
      // WHY: Redis is unavailable — fall back to in-memory counter rather than
      // allowing unlimited requests. In-memory is per-process (not cross-cluster)
      // but still provides meaningful protection.
      logger.warn('Rate limiter Redis unavailable, using in-memory fallback', {
        prefix,
        error: error.message,
      });
      const count = inMemoryIncr(`${prefix}:${req.ip || 'anon'}`, windowSeconds);
      if (count > max) {
        res.setHeader('Retry-After', String(windowSeconds));
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
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

- [ ] **Step 2: Run rate limiter tests**

```bash
cd /mnt/d/hcmproject/HCM/backend && npx jest tests/rate.limiter.resilience.test.js --no-coverage 2>&1 | tail -20
```
Expected: Pass.

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add middleware/rateLimiter.js
git commit -m "fix: add in-memory sliding window fallback when Redis is unavailable for rate limiting"
```

---

## Task 11: Add Pagination to Meetings List Endpoint

**Files:**
- Modify: `backend/modules/meetings/meetings.service.js`
- Modify: `backend/modules/meetings/meetings.repository.js`

Spec: add optional `page`/`limit` query params. Default behavior unchanged if not provided.

- [ ] **Step 1: Read meetings.repository.js getCitizenMeetings**

```bash
cd /mnt/d/hcmproject/HCM/backend && grep -n "getCitizenMeetings" modules/meetings/meetings.repository.js
```

- [ ] **Step 2: Update repository function** to accept `{ limit, offset }`

Find `getCitizenMeetings` in `meetings.repository.js`. Add LIMIT/OFFSET to the query:

```js
// WHY: Pagination added to prevent full-table returns on large datasets.
// limit/offset default to undefined = no paging (existing behavior preserved).
async function getCitizenMeetings(citizenId, { limit, offset } = {}) {
  // ... existing WHERE clause ...
  const params = [citizenId];
  let sql = `SELECT ... FROM meetings WHERE citizen_id = $1 ORDER BY created_at DESC`;
  if (limit != null) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (offset != null) {
    params.push(offset);
    sql += ` OFFSET $${params.length}`;
  }
  const { rows } = await pool.query(sql, params);
  return rows;
}
```

The exact SQL needs to match what's in the file — run step 1 to find the function first.

- [ ] **Step 3: Update service function** to accept and forward pagination params

In `meetings.service.js`, update `getCitizenMeetings`:

```js
// WHY: page/limit are optional. If omitted, behavior is unchanged (returns all).
async function getCitizenMeetings(citizenId, { page, limit } = {}) {
  const parsedLimit = limit != null ? Math.min(Number(limit) || 20, 100) : undefined;
  const parsedOffset = page != null && parsedLimit != null
    ? (Math.max(1, Number(page) || 1) - 1) * parsedLimit
    : undefined;
  return meetingsRepository.getCitizenMeetings(citizenId, {
    limit: parsedLimit,
    offset: parsedOffset,
  });
}
```

- [ ] **Step 4: Update controller to pass query params**

In `meetings.controller.js`, find the `getCitizenMeetings` handler and pass `page`/`limit` from `req.query`:

```js
// WHY: Expose optional pagination. Clients not sending page/limit get same behavior.
const { page, limit } = req.query;
const result = await meetingsService.getCitizenMeetings(req.user.sub, { page, limit });
```

- [ ] **Step 5: Run meetings tests**

```bash
cd /mnt/d/hcmproject/HCM/backend && npx jest tests/meetings.test.js --no-coverage 2>&1 | tail -20
```
Expected: Pass.

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/hcmproject/HCM/backend
git add modules/meetings/meetings.service.js modules/meetings/meetings.repository.js modules/meetings/meetings.controller.js
git commit -m "feat: add optional page/limit pagination to citizen meetings list endpoint"
```

---

## ✅ Validation Checklist

After all tasks complete, verify:

- [ ] `npm run worker:jobs` starts without errors
- [ ] Citizen registration endpoint (`POST /api/v1/auth/citizen/register`) returns immediately without waiting for SMTP
- [ ] Complaint submission (`POST /api/v1/complaints/`) returns immediately; admin notifications appear in DB shortly after
- [ ] Meeting submission (`POST /api/v1/meetings/request`) returns immediately
- [ ] `GET /api/v1/meetings/my?page=1&limit=10` returns paginated results
- [ ] `GET /api/v1/meetings/my` (no params) returns same response as before
- [ ] WebSocket connections are terminated after ~65s of inactivity (kill network, verify cleanup)
- [ ] Admin login returns 503 (not 401) when Redis is completely down (simulated by `redis-cli DEBUG SLEEP 30`)
- [ ] Citizen login succeeds when Redis is down (fail-open preserved)
- [ ] Auth endpoints return 429 when repeatedly called with Redis down (in-memory fallback active)
- [ ] Existing test suite passes: `npm test`

---

## 🚫 Out of Scope (Noted but Not Implemented)

1. **Idempotency key atomicity**: The existing `SET NX EX` in `idempotency.js` is already atomic — no change needed.
2. **Race conditions on assignment**: Would require DB-level advisory locks or `SELECT FOR UPDATE` — safe to do as a follow-up in a DB migration.
3. **Notification fan-out as single job**: Implemented at email/SMS level instead. The `notifyActiveAdmins` pattern already uses `Promise.all` for DB writes; further optimization (single job with N recipients) is a follow-up.
4. **Full URL JWT removal from WebSocket**: Added non-production guard. Full removal requires frontend changes first — coordinate with FE team.
5. **`process.pid` in health response**: Requires reading `app.js` health route — add to a separate security patch.
