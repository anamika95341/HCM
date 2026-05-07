DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'meeting_status_type' AND e.enumlabel = 'rescheduled'
  ) THEN
    ALTER TYPE meeting_status_type ADD VALUE 'rescheduled' AFTER 'scheduled';
  END IF;
END $$;
