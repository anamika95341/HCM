CREATE TABLE IF NOT EXISTS otp_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  purpose otp_purpose_type NOT NULL,
  scope_key VARCHAR(255) NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_role, user_id, purpose, scope_key)
);

CREATE INDEX IF NOT EXISTS idx_otp_records_lookup
  ON otp_records (user_role, user_id, purpose, scope_key, expires_at);

CREATE TABLE IF NOT EXISTS idempotency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(80) NOT NULL,
  actor_id UUID NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (scope, actor_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_requests_lookup
  ON idempotency_requests (scope, actor_id, idempotency_key, expires_at);
