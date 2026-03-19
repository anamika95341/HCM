# Citizen-Minister Engagement Portal Backend

Secure Node.js + Express backend for:

- Citizen registration, login, password recovery, complaints, and meeting requests
- Admin registration gate, 2FA login, workflow queues, scheduling, and audit trail
- DEO verification workflow
- Minister calendar and meeting visibility
- Redis-backed realtime updates, rate limits, revocation, and monitoring metrics

## Run locally

```bash
cd backend
npm install
npm run migrate
npm run seed
npm test
npm run dev
```

## Security highlights

- Password hashing with `bcryptjs` cost factor `12`
- RS256 JWT access tokens with per-role audience enforcement
- Refresh-token rotation with hashed tokens in PostgreSQL
- Aadhaar encryption at rest with AES-256-GCM
- Redis-backed OTPs, lockouts, rate limits, revocations, and idempotency
- Zod validation, Unicode normalization, and text sanitization
- Private upload storage with magic-byte validation hooks
- Helmet, strict CORS, generic auth error messages, and structured redacted logging
