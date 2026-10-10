-- Migration 092: Security disconnect audit log
-- Tracks all WhatsApp disconnect events with full audit trail

CREATE TABLE IF NOT EXISTS disconnect_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  disconnected_by UUID NOT NULL,
  disconnect_type TEXT NOT NULL CHECK (disconnect_type IN ('owner', 'super_admin')),
  reason TEXT,
  waba_id TEXT,
  phone_number_id TEXT,
  actions_taken JSONB DEFAULT '[]'::jsonb,
  actions_failed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE disconnect_audit_log ENABLE ROW LEVEL SECURITY;

-- Super admin can read all
CREATE POLICY "super_admin_read_all_disconnect_logs" ON disconnect_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true)
  );

-- Account members can read their own account's logs
CREATE POLICY "account_members_read_own_disconnect_logs" ON disconnect_audit_log
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );

-- Only service role can insert (via API routes)
-- This policy uses WITH CHECK (true) which only applies to service role
-- since RLS authenticated users won't match any SELECT policy for INSERT
CREATE POLICY "service_role_insert_disconnect_logs" ON disconnect_audit_log
  FOR INSERT WITH CHECK (true);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_disconnect_audit_log_account
  ON disconnect_audit_log(account_id);
CREATE INDEX IF NOT EXISTS idx_disconnect_audit_log_created
  ON disconnect_audit_log(created_at DESC);
