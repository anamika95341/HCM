CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sex_type') THEN
    CREATE TYPE sex_type AS ENUM ('male', 'female', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_type') THEN
    CREATE TYPE user_status_type AS ENUM ('pending_verification', 'active', 'locked', 'disabled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_channel_type') THEN
    CREATE TYPE verification_channel_type AS ENUM ('email', 'sms');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_purpose_type') THEN
    CREATE TYPE otp_purpose_type AS ENUM ('registration_verification', 'login_2fa', 'password_reset');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status_type') THEN
    CREATE TYPE complaint_status_type AS ENUM ('submitted', 'in_review', 'resolved', 'rejected', 'escalated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status_type') THEN
    CREATE TYPE meeting_status_type AS ENUM ('pending', 'accepted', 'rejected', 'verification_pending', 'verified', 'not_verified', 'scheduled', 'rescheduled', 'completed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS citizens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id VARCHAR(32) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  aadhaar_hash VARCHAR(64) NOT NULL UNIQUE,
  aadhaar_ciphertext TEXT NOT NULL,
  aadhaar_iv VARCHAR(64) NOT NULL,
  aadhaar_tag VARCHAR(64) NOT NULL,
  age SMALLINT NOT NULL CHECK (age BETWEEN 1 AND 120),
  sex sex_type NOT NULL,
  mobile_number VARCHAR(15) NOT NULL UNIQUE,
  pincode VARCHAR(6) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  local_mp VARCHAR(255) NOT NULL,
  photo_path TEXT,
  password_hash TEXT NOT NULL,
  status user_status_type NOT NULL DEFAULT 'pending_verification',
  preferred_verification_channel verification_channel_type NOT NULL DEFAULT 'sms',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  manual_unlock_required BOOLEAN NOT NULL DEFAULT FALSE,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_citizens_mobile ON citizens (mobile_number);
CREATE INDEX IF NOT EXISTS idx_citizens_status ON citizens (status);
CREATE INDEX IF NOT EXISTS idx_citizens_aadhaar_hash ON citizens (aadhaar_hash);
