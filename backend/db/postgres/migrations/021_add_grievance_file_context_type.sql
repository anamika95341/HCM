-- 021_add_grievance_file_context_type.sql
-- The file_context_type enum was created with ('meeting'|'appointment', 'event', 'general')
-- but never received a 'grievance' value, so attaching files to grievances
-- (citizen supporting documents, DEO-visible files) failed at the database layer
-- with: invalid input value for enum file_context_type: "grievance".
-- ALTER TYPE ... ADD VALUE must run outside a transaction block, so this file
-- intentionally contains a single statement and no BEGIN/COMMIT.
ALTER TYPE file_context_type ADD VALUE IF NOT EXISTS 'grievance';
