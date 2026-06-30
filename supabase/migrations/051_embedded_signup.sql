-- ============================================================
-- 051_embedded_signup.sql
-- Meta Embedded Signup support for WhatsApp Business API
-- ============================================================

-- Add embedded signup fields to whatsapp_config
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS setup_method TEXT DEFAULT 'manual' CHECK (setup_method IN ('manual', 'embedded_signup')),
  ADD COLUMN IF NOT EXISTS meta_business_id TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS quality_rating TEXT,
  ADD COLUMN IF NOT EXISTS messaging_limit TEXT,
  ADD COLUMN IF NOT EXISTS embedded_signup_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Embedded signup sessions (track in-progress signups)
CREATE TABLE IF NOT EXISTS embedded_signup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  state_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  meta_code TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  meta_business_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_ess_state ON embedded_signup_sessions(state_token);
CREATE INDEX IF NOT EXISTS idx_ess_account ON embedded_signup_sessions(account_id, created_at DESC);

-- RLS
ALTER TABLE embedded_signup_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ess_account ON embedded_signup_sessions FOR ALL
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY ess_admin ON embedded_signup_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true));
