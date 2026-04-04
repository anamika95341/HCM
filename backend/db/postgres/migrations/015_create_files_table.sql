DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_context_type') THEN
    CREATE TYPE file_context_type AS ENUM ('meeting', 'event', 'general');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_status_type') THEN
    CREATE TYPE file_status_type AS ENUM ('pending', 'reviewed', 'approved');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_key TEXT NOT NULL UNIQUE,
  uploaded_by UUID NOT NULL,
  uploader_role VARCHAR(50) NOT NULL,
  visible_to_role VARCHAR(50) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_category VARCHAR(20) NOT NULL,
  size BIGINT NOT NULL CHECK (size > 0),
  context_type file_context_type NOT NULL DEFAULT 'general',
  context_id UUID,
  status file_status_type NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files (uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_visible_to_role ON files (visible_to_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_context_lookup ON files (context_type, context_id, created_at DESC);
