-- 018_rename_meetings_complaints_to_appointments_grievances.sql
-- Renames all meetings → appointments and complaints → grievances

BEGIN;

-- ── ENUM types ────────────────────────────────────────────────────────────────

ALTER TYPE meeting_status_type   RENAME TO appointment_status_type;
ALTER TYPE complaint_status_type RENAME TO grievance_status_type;

-- Rename ENUM value used by grievances status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'grievance_status_type' AND e.enumlabel = 'escalated_to_meeting'
  ) THEN
    ALTER TYPE grievance_status_type RENAME VALUE 'escalated_to_meeting' TO 'escalated_to_appointment';
  END IF;
END $$;

-- Rename file context ENUM value
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'file_context_type' AND e.enumlabel = 'meeting'
  ) THEN
    ALTER TYPE file_context_type RENAME VALUE 'meeting' TO 'appointment';
  END IF;
END $$;

-- ── meetings → appointments ───────────────────────────────────────────────────

ALTER TABLE meetings RENAME TO appointments;

ALTER TABLE appointments RENAME COLUMN linked_complaint_id TO linked_grievance_id;
ALTER TABLE appointments RENAME COLUMN meeting_docket      TO appointment_docket;

-- Rename constraints on appointments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_request_id_key') THEN
    ALTER TABLE appointments RENAME CONSTRAINT meetings_request_id_key TO appointments_request_id_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_linked_complaint_fk') THEN
    ALTER TABLE appointments RENAME CONSTRAINT meetings_linked_complaint_fk TO appointments_linked_grievance_fk;
  END IF;
END $$;

-- Rename indexes on appointments
ALTER INDEX IF EXISTS idx_meetings_citizen_id     RENAME TO idx_appointments_citizen_id;
ALTER INDEX IF EXISTS idx_meetings_admin_queue    RENAME TO idx_appointments_admin_queue;
ALTER INDEX IF EXISTS idx_meetings_request_id     RENAME TO idx_appointments_request_id;
ALTER INDEX IF EXISTS idx_meetings_linked_complaint RENAME TO idx_appointments_linked_grievance;

-- ── meeting_additional_attendees → appointment_additional_attendees ───────────

ALTER TABLE meeting_additional_attendees RENAME TO appointment_additional_attendees;
ALTER TABLE appointment_additional_attendees RENAME COLUMN meeting_id TO appointment_id;

-- ── meeting_status_history → appointment_status_history ──────────────────────

ALTER TABLE meeting_status_history RENAME TO appointment_status_history;
ALTER TABLE appointment_status_history RENAME COLUMN meeting_id TO appointment_id;

-- ── minister_calendar_events: meeting_id → appointment_id ────────────────────

ALTER TABLE minister_calendar_events RENAME COLUMN meeting_id TO appointment_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'minister_calendar_events_meeting_fk') THEN
    ALTER TABLE minister_calendar_events
      RENAME CONSTRAINT minister_calendar_events_meeting_fk TO minister_calendar_events_appointment_fk;
  END IF;
END $$;

-- ── complaints → grievances ───────────────────────────────────────────────────

ALTER TABLE complaints RENAME TO grievances;

ALTER TABLE grievances RENAME COLUMN complaint_id       TO grievance_id;
ALTER TABLE grievances RENAME COLUMN complaint_location TO grievance_location;
ALTER TABLE grievances RENAME COLUMN complaint_type     TO grievance_type;
ALTER TABLE grievances RENAME COLUMN related_meeting_id TO related_appointment_id;

-- Rename constraints on grievances
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_complaint_id_key') THEN
    ALTER TABLE grievances RENAME CONSTRAINT complaints_complaint_id_key TO grievances_grievance_id_key;
  END IF;
END $$;

-- Rename indexes on grievances
ALTER INDEX IF EXISTS idx_complaints_citizen_id        RENAME TO idx_grievances_citizen_id;
ALTER INDEX IF EXISTS idx_complaints_status            RENAME TO idx_grievances_status;
ALTER INDEX IF EXISTS idx_complaints_complaint_id      RENAME TO idx_grievances_grievance_id;
ALTER INDEX IF EXISTS idx_complaints_related_meeting   RENAME TO idx_grievances_related_appointment;
ALTER INDEX IF EXISTS idx_complaints_handoff_tracking  RENAME TO idx_grievances_handoff_tracking;

-- ── complaint_status_history → grievance_status_history ──────────────────────

ALTER TABLE complaint_status_history RENAME TO grievance_status_history;
ALTER TABLE grievance_status_history RENAME COLUMN complaint_id TO grievance_id;

COMMIT;
