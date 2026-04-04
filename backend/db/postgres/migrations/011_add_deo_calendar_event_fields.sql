ALTER TABLE minister_calendar_events
  ADD COLUMN IF NOT EXISTS created_by_deo_id UUID REFERENCES deos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS who_to_meet VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_minister_calendar_created_by_deo_id
  ON minister_calendar_events (created_by_deo_id, starts_at DESC);
