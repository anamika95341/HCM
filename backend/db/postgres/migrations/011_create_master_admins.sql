CREATE TABLE IF NOT EXISTS master_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  age SMALLINT NOT NULL CHECK (age BETWEEN 1 AND 120),
  sex sex_type NOT NULL,
  designation VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status user_status_type NOT NULL DEFAULT 'active',
  password_changed_at TIMESTAMPTZ,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  manual_unlock_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by_master_admin_id UUID REFERENCES master_admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by_master_admin_id UUID REFERENCES master_admins(id) ON DELETE SET NULL;

ALTER TABLE deos
  ADD COLUMN IF NOT EXISTS created_by_master_admin_id UUID REFERENCES master_admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by_master_admin_id UUID REFERENCES master_admins(id) ON DELETE SET NULL;

UPDATE admins
SET is_verified = TRUE
WHERE status = 'active' AND is_verified IS DISTINCT FROM TRUE;

CREATE INDEX IF NOT EXISTS idx_admins_master_admin_created
  ON admins (created_by_master_admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admins_status_verified
  ON admins (status, is_verified, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deos_master_admin_created
  ON deos (created_by_master_admin_id, created_at DESC);

DROP TABLE IF EXISTS admin_token_records;
