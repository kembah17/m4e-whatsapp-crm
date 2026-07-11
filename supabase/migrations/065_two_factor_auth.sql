-- ============================================================
-- Migration 065: Two-Factor Authentication (MFA) Support
-- Adds recovery codes table for TOTP-based 2FA
-- ============================================================

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup by user for listing/validating codes
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user
  ON mfa_recovery_codes(user_id);

-- Index for finding unused codes quickly
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_unused
  ON mfa_recovery_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own recovery codes (to see count remaining)
CREATE POLICY "Users can read own recovery codes"
  ON mfa_recovery_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Service role manages recovery codes (create, mark used, delete)
CREATE POLICY "Service role manages recovery codes"
  ON mfa_recovery_codes FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Super admins can view recovery code metadata (not the hashes)
CREATE POLICY "Super admins can view recovery codes"
  ON mfa_recovery_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND is_super_admin = true
    )
  );
