-- Migration 052: SMS Sender ID registration fields
-- Adds sender ID registration tracking to whatsapp_config

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS sms_sender_id TEXT,
  ADD COLUMN IF NOT EXISTS sms_sender_id_status TEXT DEFAULT 'not_registered'
    CHECK (sms_sender_id_status IN ('not_registered', 'pending', 'approved', 'rejected', 'active')),
  ADD COLUMN IF NOT EXISTS sms_sender_id_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_sender_id_approved_at TIMESTAMPTZ;

-- Index for quick status lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_sms_sender_id_status
  ON whatsapp_config (sms_sender_id_status)
  WHERE sms_sender_id_status IS NOT NULL AND sms_sender_id_status != 'not_registered';
