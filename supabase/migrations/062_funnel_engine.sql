-- Migration 062: Funnel Engine
-- Creates tables for the Package 3 funnel configuration, metrics tracking,
-- reporting, lookalike audience sync, parameter change logging, and custom industry configs.

-- =============================================================================
-- 1. funnel_configs — One per client account
-- =============================================================================
CREATE TABLE IF NOT EXISTS funnel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Funnel',
  industry_preset TEXT NOT NULL DEFAULT 'custom',
  -- Stage 1: Attract
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  ad_budget_daily_ngn INTEGER DEFAULT 5000,
  -- Stage 3: Nurture
  nurture_length_days INTEGER NOT NULL DEFAULT 7,
  nurture_max_touchpoints INTEGER NOT NULL DEFAULT 4,
  escalate_after_unanswered INTEGER NOT NULL DEFAULT 3,
  -- Stage 4: Close
  close_mechanism TEXT NOT NULL DEFAULT 'hybrid',
  cart_recovery_delay_minutes INTEGER DEFAULT 60,
  max_discount_percent INTEGER DEFAULT 10,
  cod_confirmation_enabled BOOLEAN DEFAULT true,
  -- Stage 5: Expand
  review_request_delay_days INTEGER DEFAULT 3,
  dormancy_threshold_days INTEGER NOT NULL DEFAULT 60,
  referral_enabled BOOLEAN DEFAULT true,
  -- Lookalike
  lookalike_auto_sync BOOLEAN DEFAULT false,
  lookalike_seed_minimum INTEGER DEFAULT 100,
  lookalike_sync_frequency TEXT DEFAULT 'weekly',
  -- Reporting
  report_frequency TEXT NOT NULL DEFAULT 'biweekly',
  report_delivery_channels JSONB NOT NULL DEFAULT '["whatsapp","email","dashboard"]'::jsonb,
  -- Meta
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE funnel_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own account data" ON funnel_configs
  FOR ALL USING (is_account_member(account_id));

CREATE POLICY "Super admins full access" ON funnel_configs
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- 2. funnel_stage_metrics
-- =============================================================================
CREATE TABLE IF NOT EXISTS funnel_stage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  funnel_config_id UUID NOT NULL REFERENCES funnel_configs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('attract','capture','nurture','close','expand')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  contacts_entered INTEGER NOT NULL DEFAULT 0,
  contacts_converted INTEGER NOT NULL DEFAULT 0,
  contacts_dropped INTEGER NOT NULL DEFAULT 0,
  revenue_attributed_ngn NUMERIC(12,2) DEFAULT 0,
  cost_ngn NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fsm_account_stage ON funnel_stage_metrics(account_id, stage, period_start);

ALTER TABLE funnel_stage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own account data" ON funnel_stage_metrics
  FOR ALL USING (is_account_member(account_id));

CREATE POLICY "Super admins full access" ON funnel_stage_metrics
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- 3. funnel_reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS funnel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  funnel_config_id UUID NOT NULL REFERENCES funnel_configs(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'periodic',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  delivered_via JSONB DEFAULT '[]'::jsonb,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fr_account ON funnel_reports(account_id, created_at DESC);

ALTER TABLE funnel_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own account data" ON funnel_reports
  FOR ALL USING (is_account_member(account_id));

CREATE POLICY "Super admins full access" ON funnel_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- 4. lookalike_sync_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS lookalike_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  segment_name TEXT NOT NULL,
  segment_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_count INTEGER NOT NULL DEFAULT 0,
  meta_audience_id TEXT,
  lookalike_audience_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','uploading','processing','ready','error')),
  error_message TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lookalike_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own account data" ON lookalike_sync_log
  FOR ALL USING (is_account_member(account_id));

CREATE POLICY "Super admins full access" ON lookalike_sync_log
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- 5. preset_change_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS preset_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  funnel_config_id UUID NOT NULL REFERENCES funnel_configs(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_by UUID,
  reason TEXT,
  outcome_metric TEXT,
  baseline_value NUMERIC,
  outcome_value NUMERIC,
  outcome_measured_at TIMESTAMPTZ,
  outcome_classification TEXT CHECK (outcome_classification IN ('positive','mixed','negative','inconclusive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pcl_account ON preset_change_log(account_id, created_at DESC);
CREATE INDEX idx_pcl_param ON preset_change_log(parameter_name, outcome_classification);

ALTER TABLE preset_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own account data" ON preset_change_log
  FOR ALL USING (is_account_member(account_id));

CREATE POLICY "Super admins full access" ON preset_change_log
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- 6. custom_industry_configs
-- =============================================================================
CREATE TABLE IF NOT EXISTS custom_industry_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  sales_cycle TEXT NOT NULL,
  avg_transaction TEXT NOT NULL,
  customer_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  close_mechanism TEXT NOT NULL,
  repeat_frequency TEXT NOT NULL,
  generated_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_count INTEGER NOT NULL DEFAULT 1,
  promoted_to_preset BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_industry_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON custom_industry_configs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins full access" ON custom_industry_configs
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- =============================================================================
-- RPC: get_funnel_overview
-- =============================================================================
CREATE OR REPLACE FUNCTION get_funnel_overview(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'config', (SELECT row_to_json(fc) FROM funnel_configs fc WHERE fc.account_id = p_account_id LIMIT 1),
    'stage_metrics', COALESCE(
      (SELECT jsonb_agg(row_to_json(sm))
       FROM funnel_stage_metrics sm
       WHERE sm.account_id = p_account_id
       AND sm.period_start >= CURRENT_DATE - INTERVAL '30 days'),
      '[]'::jsonb
    ),
    'recent_reports', COALESCE(
      (SELECT jsonb_agg(row_to_json(fr))
       FROM (SELECT id, report_type, period_start, period_end, delivered_at, created_at
             FROM funnel_reports WHERE account_id = p_account_id
             ORDER BY created_at DESC LIMIT 5) fr),
      '[]'::jsonb
    ),
    'lookalike_syncs', COALESCE(
      (SELECT jsonb_agg(row_to_json(ls))
       FROM (SELECT id, segment_name, contact_count, sync_status, synced_at
             FROM lookalike_sync_log WHERE account_id = p_account_id
             ORDER BY created_at DESC LIMIT 5) ls),
      '[]'::jsonb
    )
  ) INTO result;
  RETURN result;
END;
$$;
