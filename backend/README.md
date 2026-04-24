# Citizen-Minister Engagement Portal Backend

Secure Node.js + Express backend for:

- Citizen registration, login, password recovery, complaints, and meeting requests
- Admin registration gate, 2FA login, workflow queues, scheduling, and audit trail
- DEO verification workflow
- Minister calendar and meeting visibility
- Redis-backed realtime updates, rate limits, revocation, and monitoring metrics

## Run locally

```bash
npm run dev
```

## Local object storage with MinIO

Local development uses the root `.env` file and Docker Compose:

```bash
npm run dev
```

This starts MinIO automatically with:

- `STORAGE_MODE=local`
- `S3_BUCKET=portal-private-files`
- `S3_ENDPOINT=http://minio:9000`
- `AWS_REGION=us-east-1`
- `S3_FORCE_PATH_STYLE=true`
- `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` from root `.env`

Console: `http://localhost:9001`

In local mode the backend checks whether the configured bucket exists on startup and creates it if missing. In `STORAGE_MODE=aws`, bucket creation is skipped and the AWS SDK uses the normal credential chain, including the EC2 IAM role when present.

## Security highlights

- Password hashing with `bcryptjs` cost factor `12`
- RS256 JWT access tokens with per-role audience enforcement
- Refresh-token rotation with hashed tokens in PostgreSQL
- Aadhaar encryption at rest with AES-256-GCM
- Redis-backed OTPs, lockouts, rate limits, revocations, and idempotency
- Zod validation, Unicode normalization, and text sanitization
- Private upload storage with magic-byte validation hooks
- Helmet, strict CORS, generic auth error messages, and structured redacted logging
