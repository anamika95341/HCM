DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_digest_frequency_type') THEN
    CREATE TYPE notification_digest_frequency_type AS ENUM ('realtime', 'daily', 'weekly');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_role VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL,
  channels JSONB NOT NULL DEFAULT '{"app": true, "email": true, "sms": false}'::jsonb,
  triggers JSONB NOT NULL DEFAULT '{}'::jsonb,
  digest_frequency notification_digest_frequency_type NOT NULL DEFAULT 'realtime',
  deadline_days SMALLINT NOT NULL DEFAULT 3 CHECK (deadline_days BETWEEN 1 AND 14),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_role, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role VARCHAR(20) NOT NULL,
  recipient_id UUID NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_role, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_role, recipient_id, is_read, created_at DESC);
