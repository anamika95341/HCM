-- 019_add_admin_type_cm_grievance_fields.sql
-- Adds admin_type to distinguish regular admins from the Chief Minister admin (Mahendra Pratap Singh)
-- Adds DEO letterhead tracking fields to grievances

-- Add admin_type to admins table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_type_enum') THEN
    CREATE TYPE admin_type_enum AS ENUM ('regular', 'chief_minister');
  END IF;
END $$;

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS admin_type admin_type_enum NOT NULL DEFAULT 'regular';

CREATE INDEX IF NOT EXISTS idx_admins_type ON admins (admin_type);

-- Add DEO letterhead processing fields to grievances
ALTER TABLE grievances
  ADD COLUMN IF NOT EXISTS deo_office VARCHAR(255),
  ADD COLUMN IF NOT EXISTS deo_letterhead_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS letterhead_deo_id UUID REFERENCES deos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grievances_letterhead
  ON grievances (deo_letterhead_generated_at, status)
  WHERE deo_letterhead_generated_at IS NOT NULL;

-- Also update the grievanceSelect columns in repository (tracked here for reference)
-- grievances now has: deo_office, deo_letterhead_generated_at, letterhead_deo_id
