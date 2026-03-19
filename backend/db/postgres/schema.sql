-- Full schema snapshot generated from migrations

-- 001_create_citizens.sql

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
    CREATE TYPE meeting_status_type AS ENUM ('pending', 'accepted', 'rejected', 'verification_pending', 'verified', 'not_verified', 'scheduled', 'completed', 'cancelled');
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


-- 002_create_admins.sql

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  age SMALLINT NOT NULL CHECK (age BETWEEN 1 AND 120),
  sex sex_type NOT NULL,
  designation VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  aadhaar_hash VARCHAR(64) NOT NULL UNIQUE,
  aadhaar_ciphertext TEXT NOT NULL,
  aadhaar_iv VARCHAR(64) NOT NULL,
  aadhaar_tag VARCHAR(64) NOT NULL,
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

CREATE TABLE IF NOT EXISTS admin_token_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti VARCHAR(128) NOT NULL UNIQUE,
  subject_email VARCHAR(255),
  designation VARCHAR(150),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_token_records_unused ON admin_token_records (jti, used_at);


-- 003_create_ministers.sql

CREATE TABLE IF NOT EXISTS ministers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status user_status_type NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS minister_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minister_id UUID NOT NULL REFERENCES ministers(id) ON DELETE CASCADE,
  meeting_id UUID UNIQUE,
  title VARCHAR(255) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  comments TEXT,
  created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_minister_calendar_minister_id ON minister_calendar_events (minister_id, starts_at);


-- 004_create_deo.sql

CREATE TABLE IF NOT EXISTS deos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  age SMALLINT NOT NULL CHECK (age BETWEEN 1 AND 120),
  sex sex_type NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  designation VARCHAR(150) NOT NULL,
  password_hash TEXT NOT NULL,
  status user_status_type NOT NULL DEFAULT 'active',
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  manual_unlock_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 005_create_meetings.sql

CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  stored_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  storage_path TEXT NOT NULL,
  uploaded_by_role VARCHAR(50) NOT NULL,
  uploaded_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  assigned_deo_id UUID REFERENCES deos(id) ON DELETE SET NULL,
  minister_id UUID REFERENCES ministers(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL,
  preferred_time TIMESTAMPTZ,
  admin_referral TEXT,
  document_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  status meeting_status_type NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  verification_reason TEXT,
  verification_notes TEXT,
  scheduled_at TIMESTAMPTZ,
  scheduled_location TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  admin_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE minister_calendar_events
  ADD CONSTRAINT minister_calendar_events_meeting_fk
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS meeting_additional_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  attendee_name VARCHAR(150) NOT NULL,
  attendee_phone VARCHAR(15) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  previous_status meeting_status_type,
  new_status meeting_status_type NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  actor_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_citizen_id ON meetings (citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_admin_queue ON meetings (status, assigned_admin_id, created_at DESC);


-- 006_create_complaints.sql

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  document_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  status complaint_status_type NOT NULL DEFAULT 'submitted',
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  previous_status complaint_status_type,
  new_status complaint_status_type NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  actor_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON complaints (citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status, assigned_admin_id, created_at DESC);


-- 007_create_otp_records.sql

CREATE TABLE IF NOT EXISTS verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  purpose otp_purpose_type NOT NULL,
  channel verification_channel_type NOT NULL,
  destination VARCHAR(255) NOT NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  jti UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_lookup ON refresh_tokens (user_role, user_id, revoked_at);


-- 008_create_audit_logs.sql

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_role VARCHAR(50) NOT NULL,
  actor_id UUID,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);
