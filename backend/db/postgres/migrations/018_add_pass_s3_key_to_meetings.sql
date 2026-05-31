-- 018_add_pass_s3_key_to_meetings.sql
-- Adds pass_s3_key column to the appointments table (formerly meetings).
-- Guard handles both: DBs where rename hasn't run yet (meetings) and
-- DBs where 018_rename already ran (appointments).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meetings' AND table_schema = 'public') THEN
    ALTER TABLE meetings ADD COLUMN IF NOT EXISTS pass_s3_key TEXT;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments' AND table_schema = 'public') THEN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pass_s3_key TEXT;
  END IF;
END $$;
