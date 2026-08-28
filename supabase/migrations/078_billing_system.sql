-- Migration 078: M4E Billing System
-- Paystack integration for subscriptions (recurring) and package payments (one-time)
-- Supports: 30-day free trial, annual discounts, grace periods

-- ============================================================
-- 1. Update subscription_tier enum to match tier-gating system
-- ============================================================
-- Current enum: free, starter, growth, enterprise
-- Needed: free, starter, professional, business, enterprise
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'professional' AFTER 'starter';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'business' AFTER 'professional';
-- Note: 'growth' remains for backward compat but 'professional' is the canonical name

-- ============================================================
-- 2. Add billing columns to accounts table
-- ============================================================
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annually')),
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS failed_payment_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_accounts_paystack_customer
  ON accounts (paystack_customer_code) WHERE paystack_customer_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_trial_ends
  ON accounts (trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_grace_period
  ON accounts (grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- ============================================================
-- 3. Paystack Plans (reference table for plan codes)
-- ============================================================
CREATE TABLE IF NOT EXISTS paystack_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'annually')),
  amount_kobo BIGINT NOT NULL,
  amount_naira NUMERIC GENERATED ALWAYS AS (amount_kobo / 100.0) STORED,
  currency TEXT NOT NULL DEFAULT 'NGN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  paystack_plan_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE paystack_plans ENABLE ROW LEVEL SECURITY;

-- Insert subscription plans
-- Monthly plans
INSERT INTO paystack_plans (plan_code, name, tier, interval, amount_kobo) VALUES
  ('m4e_starter_monthly', 'Starter Monthly', 'starter', 'monthly', 5000000),
  ('m4e_professional_monthly', 'Professional Monthly', 'professional', 'monthly', 12000000),
  ('m4e_business_monthly', 'Business Monthly', 'business', 'monthly', 25000000)
ON CONFLICT (plan_code) DO NOTHING;

-- Annual plans (2 months free = 10 months price)
INSERT INTO paystack_plans (plan_code, name, tier, interval, amount_kobo) VALUES
  ('m4e_starter_annually', 'Starter Annual', 'starter', 'annually', 50000000),
  ('m4e_professional_annually', 'Professional Annual', 'professional', 'annually', 120000000),
  ('m4e_business_annually', 'Business Annual', 'business', 'annually', 250000000)
ON CONFLICT (plan_code) DO NOTHING;

-- ============================================================
-- 4. M4E Subscriptions (tracks subscription lifecycle)
-- ============================================================
CREATE TABLE IF NOT EXISTS m4e_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES paystack_plans(id),
  paystack_subscription_code TEXT,
  paystack_email_token TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'suspended', 'archived')),
  tier TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'annually')),
  amount_kobo BIGINT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE m4e_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_m4e_subscriptions_account
  ON m4e_subscriptions (account_id);
CREATE INDEX IF NOT EXISTS idx_m4e_subscriptions_status
  ON m4e_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_m4e_subscriptions_paystack
  ON m4e_subscriptions (paystack_subscription_code) WHERE paystack_subscription_code IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at ON m4e_subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON m4e_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Package Payments (one-time project package purchases)
-- ============================================================
CREATE TABLE IF NOT EXISTS m4e_package_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_key TEXT NOT NULL,
  package_name TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL,
  amount_naira NUMERIC GENERATED ALWAYS AS (amount_kobo / 100.0) STORED,
  currency TEXT NOT NULL DEFAULT 'NGN',
  paystack_reference TEXT UNIQUE,
  paystack_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  payment_channel TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE m4e_package_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_m4e_package_payments_account
  ON m4e_package_payments (account_id);
CREATE INDEX IF NOT EXISTS idx_m4e_package_payments_reference
  ON m4e_package_payments (paystack_reference) WHERE paystack_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_m4e_package_payments_status
  ON m4e_package_payments (status);

DROP TRIGGER IF EXISTS set_updated_at ON m4e_package_payments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON m4e_package_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. Billing Events (audit trail for all billing actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'paystack' CHECK (source IN ('paystack', 'manual', 'system', 'admin')),
  amount_kobo BIGINT,
  currency TEXT DEFAULT 'NGN',
  paystack_reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_billing_events_account
  ON billing_events (account_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type
  ON billing_events (event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created
  ON billing_events (created_at DESC);

-- ============================================================
-- 7. RLS Policies
-- ============================================================
-- paystack_plans: readable by all authenticated users
CREATE POLICY "plans_read" ON paystack_plans
  FOR SELECT TO authenticated USING (true);

-- m4e_subscriptions: users can read their own account subscriptions
CREATE POLICY "subscriptions_read_own" ON m4e_subscriptions
  FOR SELECT TO authenticated
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- m4e_package_payments: users can read their own account payments
CREATE POLICY "package_payments_read_own" ON m4e_package_payments
  FOR SELECT TO authenticated
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- billing_events: users can read their own account events
CREATE POLICY "billing_events_read_own" ON billing_events
  FOR SELECT TO authenticated
  USING (account_id IN (
    SELECT account_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Service role can do everything (for webhook handler)
CREATE POLICY "service_role_all_plans" ON paystack_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_subscriptions" ON m4e_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_package_payments" ON m4e_package_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_billing_events" ON billing_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 8. Helper function: Check if account is in grace period
-- ============================================================
CREATE OR REPLACE FUNCTION is_account_in_grace_period(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = p_account_id
      AND subscription_status = 'suspended'
      AND grace_period_ends_at IS NOT NULL
      AND grace_period_ends_at > NOW()
  );
$$;

-- ============================================================
-- 9. Helper function: Get account billing summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_billing_summary(p_account_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'account_id', a.id,
    'tier', a.subscription_tier,
    'status', a.subscription_status,
    'billing_interval', a.billing_interval,
    'trial_ends_at', a.trial_ends_at,
    'current_period_end', a.subscription_current_period_end,
    'grace_period_ends_at', a.grace_period_ends_at,
    'last_payment_at', a.last_payment_at,
    'last_payment_amount', a.last_payment_amount,
    'failed_payment_count', a.failed_payment_count,
    'is_trialing', (a.subscription_status = 'trial' AND a.trial_ends_at > NOW()),
    'is_in_grace', is_account_in_grace_period(a.id),
    'days_until_trial_end', CASE
      WHEN a.trial_ends_at IS NOT NULL AND a.trial_ends_at > NOW()
      THEN EXTRACT(DAY FROM a.trial_ends_at - NOW())::int
      ELSE NULL
    END
  )
  FROM accounts a
  WHERE a.id = p_account_id;
$$;
