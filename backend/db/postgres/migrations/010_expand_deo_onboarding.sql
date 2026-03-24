ALTER TABLE deos
  ADD COLUMN IF NOT EXISTS aadhaar_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS aadhaar_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_iv VARCHAR(64),
  ADD COLUMN IF NOT EXISTS aadhaar_tag VARCHAR(64),
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deos_aadhaar_hash_unique
  ON deos (aadhaar_hash)
  WHERE aadhaar_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deos_created_by_admin
  ON deos (created_by_admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deos_status_verified
  ON deos (status, is_verified, created_at DESC);
