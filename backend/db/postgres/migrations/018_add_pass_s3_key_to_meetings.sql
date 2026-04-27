-- 018_add_pass_s3_key_to_meetings.sql
-- Adds a column to store the S3 key of the generated meeting appointment pass PDF.
-- When a meeting is (re)scheduled, a new pass is generated and this key is updated.
-- The old S3 object is deleted before the new one is uploaded.

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS pass_s3_key TEXT;
