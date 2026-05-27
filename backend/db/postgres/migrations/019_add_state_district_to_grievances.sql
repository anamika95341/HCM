-- 019_add_state_district_to_grievances.sql
-- Replaces grievance_location/grievance_type with state and district

ALTER TABLE grievances
  ADD COLUMN IF NOT EXISTS state    VARCHAR(120),
  ADD COLUMN IF NOT EXISTS district VARCHAR(120);
