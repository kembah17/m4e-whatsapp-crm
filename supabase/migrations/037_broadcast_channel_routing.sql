-- ============================================================
-- 037_broadcast_channel_routing.sql
--
-- Extends broadcasts to support multi-channel sending.
-- ============================================================

-- 1) Create broadcast channel enum
DO $$ BEGIN
  CREATE TYPE broadcast_channel AS ENUM ('whatsapp', 'email', 'sms', 'auto');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add channel column to broadcasts
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS channel broadcast_channel
    DEFAULT 'whatsapp';

-- 3) Add email-specific fields to broadcasts
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS email_html_body TEXT;
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS email_text_body TEXT;

-- 4) Add channel tracking to broadcast_recipients
ALTER TABLE broadcast_recipients
  ADD COLUMN IF NOT EXISTS channel TEXT
    DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'sms'));

-- 5) Add email/SMS message IDs to broadcast_recipients
ALTER TABLE broadcast_recipients
  ADD COLUMN IF NOT EXISTS email_message_id TEXT;
ALTER TABLE broadcast_recipients
  ADD COLUMN IF NOT EXISTS sms_message_id TEXT;

-- 6) Per-channel count columns on broadcasts
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS whatsapp_sent_count INTEGER DEFAULT 0;
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0;
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS sms_sent_count INTEGER DEFAULT 0;
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0;
