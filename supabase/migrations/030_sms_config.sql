-- ============================================================
-- 024_sms_config.sql — Brevo SMS integration
--
-- Adds sms_config table for storing SMS sender configuration
-- per account. Uses the SAME Brevo API key as email_config —
-- Brevo supports both email and SMS with one key.
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Sender ID: up to 11 alphanumeric chars displayed as SMS sender.
  -- e.g. "M4E", "AcmeCorp", or client business name.
  -- Some Nigerian carriers require pre-registered sender IDs.
  sender_id TEXT NOT NULL DEFAULT 'M4E',
  -- Whether SMS sending is enabled for this account.
  enabled BOOLEAN NOT NULL DEFAULT false,
  -- Optional: monthly SMS cost cap in the account's currency.
  -- NULL means no cap. Automation engine checks this before sending.
  monthly_cost_cap NUMERIC(12,2) DEFAULT NULL,
  -- Running total of SMS sent this calendar month (reset by cron/trigger).
  monthly_sms_count INTEGER NOT NULL DEFAULT 0,
  -- Timestamp of last monthly counter reset.
  month_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE sms_config ENABLE ROW LEVEL SECURITY;

-- RLS policies using is_account_member() from migration 017
DROP POLICY IF EXISTS sms_config_select ON sms_config;
CREATE POLICY sms_config_select ON sms_config FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS sms_config_insert ON sms_config;
CREATE POLICY sms_config_insert ON sms_config FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS sms_config_update ON sms_config;
CREATE POLICY sms_config_update ON sms_config FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS sms_config_delete ON sms_config;
CREATE POLICY sms_config_delete ON sms_config FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Updated-at trigger (reuses existing function from earlier migrations)
DROP TRIGGER IF EXISTS set_updated_at ON sms_config;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sms_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SMS log table for tracking individual SMS sends and costs.
-- Enables the real-time cost dashboard mentioned in the service
-- agreement.
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Brevo message ID for delivery tracking
  brevo_message_id TEXT,
  -- Recipient phone (stored for audit even if contact deleted)
  recipient_phone TEXT NOT NULL,
  -- SMS content (truncated to 320 chars for storage)
  content TEXT,
  -- Number of SMS segments used (1 for ≤160 chars, more for longer)
  sms_count INTEGER NOT NULL DEFAULT 1,
  -- Delivery status: queued, sent, delivered, failed
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  -- Error message if failed
  error_message TEXT,
  -- Source: 'automation', 'manual', 'test'
  source TEXT NOT NULL DEFAULT 'manual',
  -- Reference to automation_logs if sent by automation
  automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_log_select ON sms_log;
CREATE POLICY sms_log_select ON sms_log FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS sms_log_insert ON sms_log;
CREATE POLICY sms_log_insert ON sms_log FOR INSERT
  WITH CHECK (is_account_member(account_id, 'viewer'));

-- Index for cost dashboard queries
CREATE INDEX IF NOT EXISTS idx_sms_log_account_created
  ON sms_log(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_log_contact
  ON sms_log(contact_id) WHERE contact_id IS NOT NULL;
