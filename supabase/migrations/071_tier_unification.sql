-- ============================================================
-- Migration 071: Tier Unification & Operational Limits
-- ============================================================
-- Unifies subscription_tier enum with FeatureTier code names:
--   free → starter (with trial), growth → business
-- Adds: professional, business to enum
-- Adds: trial support columns, operational limit columns
-- Recreates: get_platform_revenue_overview() with correct prices
-- Creates: check_trial_expiry(), v_account_limit_usage view
-- ============================================================

-- ============================================================
-- 1A. Add new enum values
-- ============================================================
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'professional';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'business';

-- NOTE: PostgreSQL cannot remove enum values.
-- 'free' and 'growth' remain in the enum but will be unused after data migration.

-- ============================================================
-- 1B. Update existing data
-- ============================================================
-- Accounts on 'free' tier become 'starter' with trial status
UPDATE accounts
SET subscription_tier = 'starter',
    subscription_status = 'trial'
WHERE subscription_tier = 'free';

-- Accounts on 'growth' tier become 'business'
UPDATE accounts
SET subscription_tier = 'business'
WHERE subscription_tier = 'growth';

-- Change default from 'free' to 'starter'
ALTER TABLE accounts ALTER COLUMN subscription_tier SET DEFAULT 'starter';

-- ============================================================
-- 1C. Add trial support columns
-- ============================================================
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_tier TEXT DEFAULT 'starter';

-- Set trial_ends_at for existing trial accounts (14 days from now)
UPDATE accounts
SET trial_ends_at = now() + INTERVAL '14 days'
WHERE subscription_status = 'trial' AND trial_ends_at IS NULL;

-- ============================================================
-- 1D. Add operational limit columns to feature_access_config
-- ============================================================
ALTER TABLE feature_access_config
  ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_products INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_pipelines INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_automations INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_whatsapp_flows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_ai_chatbot_msgs_per_month INTEGER DEFAULT 0;

-- ============================================================
-- 1E. Recreate get_platform_revenue_overview() with new tiers
-- ============================================================
CREATE OR REPLACE FUNCTION get_platform_revenue_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super admin required';
  END IF;

  SELECT jsonb_build_object(
    'tier_distribution', jsonb_build_object(
      'starter', (SELECT COUNT(*) FROM accounts WHERE subscription_tier = 'starter'),
      'professional', (SELECT COUNT(*) FROM accounts WHERE subscription_tier = 'professional'),
      'business', (SELECT COUNT(*) FROM accounts WHERE subscription_tier = 'business'),
      'enterprise', (SELECT COUNT(*) FROM accounts WHERE subscription_tier = 'enterprise')
    ),
    'status_distribution', jsonb_build_object(
      'active', (SELECT COUNT(*) FROM accounts WHERE subscription_status = 'active'),
      'trial', (SELECT COUNT(*) FROM accounts WHERE subscription_status = 'trial'),
      'suspended', (SELECT COUNT(*) FROM accounts WHERE subscription_status = 'suspended'),
      'cancelled', (SELECT COUNT(*) FROM accounts WHERE subscription_status = 'cancelled')
    ),
    'projected_mrr', (
      SELECT COALESCE(SUM(
        CASE subscription_tier
          WHEN 'starter' THEN 50000
          WHEN 'professional' THEN 120000
          WHEN 'business' THEN 250000
          WHEN 'enterprise' THEN 0
          ELSE 0
        END
      ), 0)
      FROM accounts
      WHERE subscription_status IN ('active', 'trial')
    ),
    'accounts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'account_name', a.name,
        'owner_email', p.email,
        'subscription_tier', a.subscription_tier,
        'subscription_status', a.subscription_status,
        'created_at', a.created_at,
        'contact_count', (SELECT COUNT(*) FROM contacts ct WHERE ct.account_id = a.id)
      ) ORDER BY a.created_at DESC)
      FROM accounts a
      LEFT JOIN profiles p ON p.user_id = a.owner_user_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 1E-b. Update get_platform_alerts() approaching_limits thresholds
-- ============================================================
CREATE OR REPLACE FUNCTION get_platform_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super admin required';
  END IF;

  SELECT jsonb_build_object(
    'disconnected_whatsapp', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'account_name', a.name,
        'owner_email', p.email,
        'created_at', a.created_at
      ))
      FROM accounts a
      LEFT JOIN profiles p ON p.user_id = a.owner_user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM whatsapp_config wc
        JOIN profiles wp ON wp.user_id = wc.user_id AND wp.account_id = a.id
        WHERE wc.status = 'connected'
      )
    ), '[]'::jsonb),
    'inactive_accounts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'account_name', a.name,
        'owner_email', p.email,
        'last_activity', sub.last_msg
      ))
      FROM accounts a
      LEFT JOIN profiles p ON p.user_id = a.owner_user_id
      LEFT JOIN LATERAL (
        SELECT MAX(m.created_at) AS last_msg
        FROM messages m
        JOIN conversations cv ON cv.id = m.conversation_id
        JOIN contacts ct ON ct.id = cv.contact_id
        WHERE ct.account_id = a.id
      ) sub ON true
      WHERE sub.last_msg IS NULL OR sub.last_msg < now() - interval '30 days'
    ), '[]'::jsonb),
    'failed_broadcasts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'account_name', a.name,
        'broadcast_id', b.id,
        'broadcast_name', b.name,
        'status', b.status,
        'created_at', b.created_at
      ))
      FROM broadcasts b
      JOIN profiles bp ON bp.user_id = b.user_id
      JOIN accounts a ON a.id = bp.account_id
      WHERE b.status = 'failed'
        AND b.created_at > now() - interval '7 days'
    ), '[]'::jsonb),
    'approaching_limits', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', a.id,
        'account_name', a.name,
        'contact_count', cnt.c,
        'tier', a.subscription_tier
      ))
      FROM accounts a
      JOIN LATERAL (
        SELECT COUNT(*) AS c FROM contacts ct WHERE ct.account_id = a.id
      ) cnt ON true
      WHERE (
        (a.subscription_tier = 'starter' AND cnt.c >= 450)
        OR (a.subscription_tier = 'professional' AND cnt.c >= 1800)
        OR (a.subscription_tier = 'business' AND cnt.c >= 9000)
      )
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 1F. Create trial expiry check function
-- ============================================================
CREATE OR REPLACE FUNCTION check_trial_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Suspend accounts whose trial has expired
  UPDATE accounts
  SET subscription_status = 'suspended'
  WHERE subscription_status = 'trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now();
END;
$$;

GRANT EXECUTE ON FUNCTION check_trial_expiry TO authenticated;

-- ============================================================
-- 1G. Create operational limits monitoring view
-- ============================================================
CREATE OR REPLACE VIEW v_account_limit_usage AS
SELECT
  a.id AS account_id,
  a.name AS account_name,
  a.subscription_tier,
  fac.current_tier,
  fac.max_contacts,
  (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id) AS current_contacts,
  fac.max_broadcasts_per_month,
  fac.max_campaigns,
  fac.max_team_members,
  (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id) AS current_team_members,
  fac.max_branches,
  fac.max_products,
  (SELECT COUNT(*) FROM products pr WHERE pr.account_id = a.id) AS current_products,
  fac.max_ai_queries_per_day
FROM accounts a
LEFT JOIN feature_access_config fac ON fac.account_id = a.id;

-- ============================================================
-- Done: Tier Unification Migration 071
-- ============================================================
