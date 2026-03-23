DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'complaint_status_type' AND e.enumlabel = 'assigned'
  ) THEN
    ALTER TYPE complaint_status_type ADD VALUE 'assigned';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'complaint_status_type' AND e.enumlabel = 'department_contact_identified'
  ) THEN
    ALTER TYPE complaint_status_type ADD VALUE 'department_contact_identified';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'complaint_status_type' AND e.enumlabel = 'call_scheduled'
  ) THEN
    ALTER TYPE complaint_status_type ADD VALUE 'call_scheduled';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'complaint_status_type' AND e.enumlabel = 'followup_in_progress'
  ) THEN
    ALTER TYPE complaint_status_type ADD VALUE 'followup_in_progress';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'complaint_status_type' AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE complaint_status_type ADD VALUE 'completed';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'complaint_status_type' AND e.enumlabel = 'escalated_to_meeting'
  ) THEN
    ALTER TYPE complaint_status_type ADD VALUE 'escalated_to_meeting';
  END IF;
END $$;

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS request_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS linked_complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS meeting_docket VARCHAR(32),
  ADD COLUMN IF NOT EXISTS completion_note TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS complaint_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS complaint_location TEXT,
  ADD COLUMN IF NOT EXISTS complaint_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS department VARCHAR(150),
  ADD COLUMN IF NOT EXISTS officer_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS officer_contact VARCHAR(255),
  ADD COLUMN IF NOT EXISTS manual_contact VARCHAR(255),
  ADD COLUMN IF NOT EXISTS call_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_outcome TEXT,
  ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
  ADD COLUMN IF NOT EXISTS resolution_document_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS reopened_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS related_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

UPDATE meetings
SET request_id = CONCAT('MREQ-', TO_CHAR(created_at, 'YYYY'), '-', LPAD(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6), 6, '0'))
WHERE request_id IS NULL;

UPDATE complaints
SET complaint_id = CONCAT('COMP-', TO_CHAR(created_at, 'YYYY'), '-', LPAD(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6), 6, '0'))
WHERE complaint_id IS NULL;

ALTER TABLE meetings
  ALTER COLUMN request_id SET NOT NULL;

ALTER TABLE complaints
  ALTER COLUMN complaint_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meetings_request_id_key'
  ) THEN
    ALTER TABLE meetings ADD CONSTRAINT meetings_request_id_key UNIQUE (request_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaints_complaint_id_key'
  ) THEN
    ALTER TABLE complaints ADD CONSTRAINT complaints_complaint_id_key UNIQUE (complaint_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meetings_request_id ON meetings (request_id);
CREATE INDEX IF NOT EXISTS idx_meetings_linked_complaint ON meetings (linked_complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_id ON complaints (complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_related_meeting ON complaints (related_meeting_id);
