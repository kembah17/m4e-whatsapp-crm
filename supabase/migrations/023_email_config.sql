-- ============================================================
-- 023_email_config.sql — Brevo email integration
--
-- Adds email_config table (mirrors whatsapp_config pattern) for
-- storing Brevo API credentials per account. Also extends the
-- automation engine to support send_email steps.
-- ============================================================

CREATE TABLE IF NOT EXISTS email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'brevo' CHECK (provider IN ('brevo')),
  api_key TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
  connected_at TIMESTAMPTZ,
  daily_limit INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;

-- RLS policies using the is_account_member() function from migration 017
DROP POLICY IF EXISTS email_config_select ON email_config;
CREATE POLICY email_config_select ON email_config FOR SELECT
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS email_config_insert ON email_config;
CREATE POLICY email_config_insert ON email_config FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS email_config_update ON email_config;
CREATE POLICY email_config_update ON email_config FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS email_config_delete ON email_config;
CREATE POLICY email_config_delete ON email_config FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Updated-at trigger
DROP TRIGGER IF EXISTS set_updated_at ON email_config;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON email_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
