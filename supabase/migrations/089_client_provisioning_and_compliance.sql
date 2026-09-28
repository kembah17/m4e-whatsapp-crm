-- ============================================================
-- 089: Client Provisioning & WhatsApp Compliance
-- Phase B: Client provisioning tables
-- Phase C: Consent management & webhook idempotency
-- ============================================================

-- ============================================================
-- 1. CLIENT PROVISIONING
-- ============================================================

-- M4E internal checklist for each client setup
CREATE TABLE IF NOT EXISTS client_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_title TEXT NOT NULL,
  task_category TEXT NOT NULL DEFAULT 'setup' CHECK (task_category IN ('setup', 'data', 'whatsapp', 'training', 'launch')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, task_key)
);

ALTER TABLE client_onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_client_onboarding_account ON client_onboarding_tasks(account_id);

-- RLS: Super admin only (M4E staff)
CREATE POLICY "Super admin manages client tasks"
  ON client_onboarding_tasks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true)
  );

-- Client provisioning audit log
CREATE TABLE IF NOT EXISTS client_provisioning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_provisioning_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_provisioning_log_account ON client_provisioning_log(account_id, created_at DESC);

CREATE POLICY "Super admin reads provisioning log"
  ON client_provisioning_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true)
  );

-- Add CAC documentation and provisioning fields to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cac_status TEXT DEFAULT 'not_provided' CHECK (cac_status IN ('not_provided', 'provided', 'alternative_docs', 'm4e_provisioned'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cac_document_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS provisioned_by UUID REFERENCES auth.users(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS assigned_package TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS package_start_date DATE;

-- ============================================================
-- 2. CONSENT & COMPLIANCE (Phase C)
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('whatsapp_marketing', 'whatsapp_transactional', 'email_marketing', 'sms_marketing', 'data_processing', 'ndpr_explicit')),
  status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'withdrawn', 'expired')),
  source TEXT NOT NULL CHECK (source IN ('import', 'flow_completion', 'manual_entry', 'whatsapp_optin', 'web_form', 'api')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  ip_address TEXT,
  evidence TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_consents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_consents_contact ON contact_consents(contact_id, consent_type);
CREATE INDEX idx_consents_account ON contact_consents(account_id);
CREATE INDEX idx_consents_status ON contact_consents(status) WHERE status = 'granted';

CREATE POLICY "Account members manage consents"
  ON contact_consents FOR ALL
  USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- 3. WEBHOOK IDEMPOTENCY
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (webhook_type IN ('whatsapp', 'paystack', 'meta')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, webhook_type)
);

ALTER TABLE webhook_processed_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_webhook_processed_lookup ON webhook_processed_messages(message_id, webhook_type);

-- Auto-cleanup old processed messages (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_processed_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_processed_messages
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Service role manages processed messages"
  ON webhook_processed_messages FOR ALL
  USING (true)
  WITH CHECK (true);
