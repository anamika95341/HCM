ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS incident_date DATE;
