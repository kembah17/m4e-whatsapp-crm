-- Add mfa_enrolled flag to profiles for 2FA enforcement
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enrolled BOOLEAN NOT NULL DEFAULT false;

-- Update existing profiles: check if user has verified TOTP factors
-- This is a one-time backfill; the app will maintain this flag going forward
UPDATE profiles p
SET mfa_enrolled = true
WHERE EXISTS (
  SELECT 1 FROM auth.mfa_factors f
  WHERE f.user_id = p.user_id
    AND f.factor_type = 'totp'
    AND f.status = 'verified'
);

COMMENT ON COLUMN profiles.mfa_enrolled IS 'Whether user has enrolled in MFA. Maintained by the app on enroll/unenroll.';
