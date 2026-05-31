-- Allow DEO to create grievances without a linked citizen account.
-- Citizen-created grievances always keep citizen_id set (enforced in application layer).
-- DEO-created grievances store name + phone directly; citizen_id is NULL.

ALTER TABLE grievances
  ALTER COLUMN citizen_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS citizen_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS citizen_phone VARCHAR(50);

-- Re-create FK as SET NULL so removing a citizen record doesn't cascade-delete grievances
ALTER TABLE grievances
  DROP CONSTRAINT IF EXISTS grievances_citizen_id_fkey;

ALTER TABLE grievances
  ADD CONSTRAINT grievances_citizen_id_fkey
    FOREIGN KEY (citizen_id) REFERENCES citizens(id) ON DELETE SET NULL;

-- Partial index — only covers citizen-linked rows (same performance for citizen queries)
DROP INDEX IF EXISTS idx_grievances_citizen_id;
CREATE INDEX IF NOT EXISTS idx_grievances_citizen_id
  ON grievances (citizen_id, created_at DESC)
  WHERE citizen_id IS NOT NULL;
