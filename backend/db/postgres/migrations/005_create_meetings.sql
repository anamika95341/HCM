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
