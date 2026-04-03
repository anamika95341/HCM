ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS handoff_type VARCHAR(32),
  ADD COLUMN IF NOT EXISTS handoff_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handoff_to_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_handoff_tracking
  ON complaints (handoff_type, handoff_by_admin_id, handoff_to_admin_id, updated_at DESC);
