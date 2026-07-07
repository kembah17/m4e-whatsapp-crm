-- ============================================================
-- PACKAGE EXECUTION SYSTEM
-- Migration 060: Complete package execution infrastructure
-- ============================================================

-- 1. Package Configurations
CREATE TABLE IF NOT EXISTS package_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_naira NUMERIC NOT NULL DEFAULT 0,
  duration_weeks INTEGER NOT NULL DEFAULT 8,
  tier INTEGER NOT NULL DEFAULT 1,
  campaign_slugs TEXT[] NOT NULL DEFAULT '{}',
  automation_types TEXT[] NOT NULL DEFAULT '{}',
  flow_types TEXT[] NOT NULL DEFAULT '{}',
  report_frequency TEXT NOT NULL DEFAULT 'monthly',
  retainer_options JSONB NOT NULL DEFAULT '[]',
  milestone_template JSONB NOT NULL DEFAULT '[]',
  transition_rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Package Milestones (per-client progress tracking)
CREATE TABLE IF NOT EXISTS package_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_config_id UUID NOT NULL REFERENCES package_configs(id),
  milestone_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  week_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  planned_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  deliverables JSONB NOT NULL DEFAULT '[]',
  criteria JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_milestones_account ON package_milestones(account_id);
CREATE INDEX idx_milestones_config ON package_milestones(package_config_id);
CREATE INDEX idx_milestones_status ON package_milestones(status);

-- 3. Package Transitions (upgrade/retainer recommendations)
CREATE TABLE IF NOT EXISTS package_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  from_package_id UUID REFERENCES package_configs(id),
  to_package_id UUID REFERENCES package_configs(id),
  transition_type TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  quantitative_scores JSONB NOT NULL DEFAULT '{}',
  qualitative_scores JSONB NOT NULL DEFAULT '{}',
  recommendation_text TEXT,
  decision TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transitions_account ON package_transitions(account_id);

-- 4. Execution Metrics (Layer 1 - automatic performance data)
CREATE TABLE IF NOT EXISTS execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_config_id UUID REFERENCES package_configs(id),
  metric_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_metrics_account ON execution_metrics(account_id);
CREATE INDEX idx_exec_metrics_type ON execution_metrics(metric_type);
CREATE INDEX idx_exec_metrics_period ON execution_metrics(period_start, period_end);

-- 5. Improvement Log (Layer 3 - strategic insights from retrospectives)
CREATE TABLE IF NOT EXISTS improvement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  package_config_id UUID REFERENCES package_configs(id),
  log_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  action_items JSONB NOT NULL DEFAULT '[]',
  impact_assessment TEXT,
  outcome TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_improvement_log_type ON improvement_log(log_type);

-- 6. Client Outcomes (Dimension 1 - outcome intelligence)
CREATE TABLE IF NOT EXISTS client_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_config_id UUID NOT NULL REFERENCES package_configs(id),
  outcome_type TEXT NOT NULL,
  outcome_key TEXT NOT NULL,
  outcome_value NUMERIC,
  outcome_text TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_outcomes_account ON client_outcomes(account_id);
CREATE INDEX idx_client_outcomes_type ON client_outcomes(outcome_type);

-- 7. Package Validation Tracking (for self-execution testing)
CREATE TABLE IF NOT EXISTS package_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_config_id UUID NOT NULL REFERENCES package_configs(id),
  validation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  findings JSONB NOT NULL DEFAULT '[]',
  metrics_snapshot JSONB NOT NULL DEFAULT '{}',
  bottlenecks JSONB NOT NULL DEFAULT '[]',
  time_estimates_validated BOOLEAN NOT NULL DEFAULT false,
  deliverables_produced BOOLEAN NOT NULL DEFAULT false,
  edge_cases_handled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validations_package ON package_validations(package_config_id);

-- 8. Guided Access Configuration (replaces hard tier locks)
CREATE TABLE IF NOT EXISTS guided_access_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_config_id UUID REFERENCES package_configs(id),
  feature_key TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'self_service',
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  upgrade_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, feature_key)
);

CREATE INDEX idx_guided_access_account ON guided_access_config(account_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- package_configs: readable by all authenticated, writable by super admin
ALTER TABLE package_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_configs_read" ON package_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "package_configs_admin" ON package_configs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- package_milestones: account members can read, super admin can write
ALTER TABLE package_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones_read" ON package_milestones FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "milestones_admin" ON package_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- package_transitions: same pattern
ALTER TABLE package_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transitions_read" ON package_transitions FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "transitions_admin" ON package_transitions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- execution_metrics: account members read, system/admin write
ALTER TABLE execution_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_metrics_read" ON execution_metrics FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "exec_metrics_admin" ON execution_metrics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- improvement_log: super admin only
ALTER TABLE improvement_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "improvement_log_admin" ON improvement_log FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- client_outcomes: account members read, admin write
ALTER TABLE client_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outcomes_read" ON client_outcomes FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "outcomes_admin" ON client_outcomes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- package_validations: super admin only
ALTER TABLE package_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validations_admin" ON package_validations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- guided_access_config: account members read, admin write
ALTER TABLE guided_access_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guided_access_read" ON guided_access_config FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM account_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "guided_access_admin" ON guided_access_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- ============================================================
-- SEED DATA: Package Configurations
-- ============================================================

INSERT INTO package_configs (package_key, name, description, price_naira, duration_weeks, tier, campaign_slugs, automation_types, flow_types, report_frequency, retainer_options, milestone_template, transition_rules) VALUES
(
  'pkg1_reactivation',
  'Customer Reactivation',
  'Reactivate dormant customers and build a self-reinforcing marketing system',
  2000000,
  8,
  1,
  ARRAY['win_back_campaign', 'review_collection', 'birthday_campaign', 'referral_program', 'vip_loyalty', 'post_purchase_followup'],
  ARRAY['welcome_message', 'out_of_office', 'satisfaction_gate', 'wonback_detection'],
  ARRAY['welcome_menu', 'satisfaction_collection'],
  'monthly',
  '[{"name": "Maintain", "price": 150000, "monitoring_level": "Automated alerts only", "intervention_frequency": "Monthly review"}, {"name": "Grow", "price": 350000, "monitoring_level": "Weekly dashboard review", "intervention_frequency": "Bi-weekly optimisation"}, {"name": "Scale", "price": 750000, "monitoring_level": "Daily monitoring", "intervention_frequency": "Weekly optimisation"}]'::jsonb,
  '[{"week": 1, "name": "Client Onboarding", "description": "Onboarding call, data source identification", "deliverables": ["Onboarding call completed", "Data sources identified"], "criteria": ["Client access granted", "Contact sources listed"]}, {"week": 2, "name": "Data Collection & Import", "description": "Contact import, deduplication, RFM segmentation", "deliverables": ["Contacts imported", "Segments created"], "criteria": [">=100 contacts imported", "RFM scores assigned"]}, {"week": 3, "name": "Campaign Configuration", "description": "Configure and get approval for campaigns", "deliverables": ["Campaign messages drafted", "Client approval obtained"], "criteria": ["All 6 campaigns configured", "Messages approved"]}, {"week": 4, "name": "Campaign Activation", "description": "Launch win-back and satisfaction campaigns", "deliverables": ["Win-back launched", "Satisfaction screening active"], "criteria": ["First messages sent", "Responses tracked"]}, {"week": 5, "name": "Response Analysis", "description": "Analyse responses, adjust messaging", "deliverables": ["Performance report", "Message adjustments"], "criteria": [">10% response rate", "Adjustments implemented"]}, {"week": 6, "name": "Lifecycle Campaigns", "description": "Activate birthday and VIP campaigns", "deliverables": ["Birthday campaign active", "VIP programme launched"], "criteria": ["Automated triggers working", "VIP segment defined"]}, {"week": 7, "name": "Referral & Review", "description": "Launch referral programme, collect reviews", "deliverables": ["Referral programme active", "Reviews collected"], "criteria": [">=5 reviews collected", "Referral links distributed"]}, {"week": 8, "name": "Final Report & Transition", "description": "Comprehensive report and transition discussion", "deliverables": ["Final report", "Transition recommendation"], "criteria": ["All metrics documented", "Recommendation presented"]}]'::jsonb,
  '{"next_packages": ["pkg2_online_presence"], "quantitative_criteria": [{"metric": "satisfaction_score", "threshold": 3.5, "operator": ">="}, {"metric": "reactivation_rate", "threshold": 0.10, "operator": ">="}, {"metric": "revenue_recovered", "threshold": 200000, "operator": ">="}, {"metric": "contact_health", "threshold": 0.70, "operator": ">="}, {"metric": "campaign_engagement", "threshold": 0.15, "operator": ">="}], "qualitative_criteria": [{"key": "needs_website", "description": "Client has no website or outdated website"}, {"key": "industry_fits_online", "description": "Industry benefits from online presence"}, {"key": "expressed_interest", "description": "Client expressed interest in digital growth"}], "qualitative_minimum": 2}'::jsonb
),
(
  'pkg2_online_presence',
  'Online Presence',
  'Build professional website, brand identity, and digital foundation',
  3500000,
  8,
  2,
  ARRAY['lead_nurture', 'ad_lead_nurture', 'whatsapp_flow_survey'],
  ARRAY['new_lead_welcome', 'lead_scoring', 'email_nurture_trigger'],
  ARRAY['lead_qualification'],
  'monthly',
  '[{"name": "Maintain", "price": 150000, "monitoring_level": "Automated alerts only", "intervention_frequency": "Monthly review"}, {"name": "Grow", "price": 350000, "monitoring_level": "Weekly dashboard review", "intervention_frequency": "Bi-weekly optimisation"}]'::jsonb,
  '[{"week": 1, "name": "Brand Discovery", "description": "Brand strategy session, competitor analysis", "deliverables": ["Brand brief", "Competitor analysis"], "criteria": ["Brand direction approved", "Competitors mapped"]}, {"week": 2, "name": "Brand Identity", "description": "Color palette, typography, logo concepts", "deliverables": ["Color palette", "Typography system", "Logo concepts"], "criteria": ["Palette approved", "Fonts selected"]}, {"week": 3, "name": "Website Design", "description": "Wireframes, design mockups", "deliverables": ["Wireframes", "Design mockups"], "criteria": ["Layout approved", "Design direction confirmed"]}, {"week": 4, "name": "Website Development", "description": "Build website with brand identity", "deliverables": ["Staging site", "Content draft"], "criteria": ["All pages built", "Content populated"]}, {"week": 5, "name": "Content & SEO", "description": "Content refinement, SEO implementation", "deliverables": ["SEO audit", "Schema markup", "Sitemap"], "criteria": ["Lighthouse >90", "Schema validated"]}, {"week": 6, "name": "Analytics & Tracking", "description": "GA4 setup, conversion tracking", "deliverables": ["Analytics configured", "Tracking verified"], "criteria": ["Data flowing", "Goals configured"]}, {"week": 7, "name": "Launch & Testing", "description": "QA, cross-browser testing, launch", "deliverables": ["QA report", "Live website"], "criteria": ["Zero critical bugs", "Site live"]}, {"week": 8, "name": "Report & Transition", "description": "Performance baseline, transition discussion", "deliverables": ["Baseline report", "Brand guide", "Transition recommendation"], "criteria": ["All deliverables handed over", "Client trained"]}]'::jsonb,
  '{"next_packages": ["pkg3_growth_engine"], "quantitative_criteria": [{"metric": "satisfaction_score", "threshold": 3.5, "operator": ">="}, {"metric": "website_live", "threshold": 1, "operator": ">="}, {"metric": "leads_generated", "threshold": 5, "operator": ">="}, {"metric": "email_open_rate", "threshold": 0.25, "operator": ">="}, {"metric": "brand_guide_approved", "threshold": 1, "operator": ">="}, {"metric": "analytics_verified", "threshold": 1, "operator": ">="}], "qualitative_criteria": [{"key": "has_ad_budget", "description": "Client has advertising budget >= 200K/month"}, {"key": "competitors_advertising", "description": "Competitors are actively advertising"}, {"key": "capacity_for_leads", "description": "Client can handle increased lead volume"}], "qualitative_minimum": 2}'::jsonb
),
(
  'pkg3_growth_engine',
  'Growth Engine',
  'Paid advertising, advanced campaigns, and aggressive growth strategy',
  5000000,
  12,
  3,
  ARRAY['abandoned_cart', 'order_status', 'cod_confirmation', 'cross_sell_upsell', 'catalog_browse'],
  ARRAY['cart_abandonment_trigger', 'order_status_update', 'cod_confirmation_flow', 'cross_sell_trigger', 'catalog_browse_trigger'],
  ARRAY['ad_lead_capture', 'retargeting_flow', 'conversion_funnel'],
  'weekly',
  '[{"name": "Grow", "price": 350000, "monitoring_level": "Weekly dashboard review", "intervention_frequency": "Bi-weekly optimisation"}, {"name": "Scale", "price": 750000, "monitoring_level": "Daily monitoring", "intervention_frequency": "Weekly optimisation"}]'::jsonb,
  '[{"week": 1, "name": "Strategy Session", "description": "3-hour strategy session with client", "deliverables": ["Strategy session summary", "Campaign architecture", "Creative brief", "12-week calendar"], "criteria": ["Budget approved", "Channels selected", "Creative direction approved"]}, {"week": 2, "name": "Creative Production", "description": "Ad creative development", "deliverables": ["Ad creatives", "Landing pages"], "criteria": ["Creatives approved", "Landing pages live"]}, {"week": 3, "name": "Campaign Launch", "description": "Launch initial ad campaigns", "deliverables": ["Campaigns live", "Tracking verified"], "criteria": ["Ads running", "Conversions tracking"]}, {"week": 4, "name": "Optimisation Round 1", "description": "First optimisation based on data", "deliverables": ["Performance report", "Optimisation actions"], "criteria": ["CPA within target", "ROAS positive"]}, {"week": 5, "name": "E-commerce Integration", "description": "Cart recovery, order status, COD flows", "deliverables": ["Integrations active", "Automations configured"], "criteria": ["Webhooks receiving", "Automations triggering"]}, {"week": 6, "name": "Scale Testing", "description": "Test scaling ad spend", "deliverables": ["Scale test results", "Budget recommendation"], "criteria": ["ROAS maintained at higher spend"]}, {"week": 7, "name": "Advanced Campaigns", "description": "Cross-sell, upsell, catalog campaigns", "deliverables": ["Advanced campaigns active"], "criteria": ["All campaign types running"]}, {"week": 8, "name": "Mid-Point Review", "description": "Comprehensive mid-point analysis", "deliverables": ["Mid-point report", "Strategy adjustments"], "criteria": ["ROI positive", "Client satisfied"]}, {"week": 9, "name": "Retargeting", "description": "Implement retargeting campaigns", "deliverables": ["Retargeting active"], "criteria": ["Audiences built", "Ads serving"]}, {"week": 10, "name": "Full Funnel Optimisation", "description": "Optimise entire funnel", "deliverables": ["Funnel analysis", "Optimisation plan"], "criteria": ["Conversion rate improving"]}, {"week": 11, "name": "Automation & Scale", "description": "Automate winning campaigns", "deliverables": ["Automated rules", "Scaling plan"], "criteria": ["Automation running"]}, {"week": 12, "name": "Final Report & Transition", "description": "Comprehensive report and growth plan", "deliverables": ["Final report", "Growth roadmap", "Transition recommendation"], "criteria": ["All metrics documented", "ROI calculated"]}]'::jsonb,
  '{"next_packages": [], "quantitative_criteria": [{"metric": "roas", "threshold": 2.0, "operator": ">="}, {"metric": "leads_generated", "threshold": 50, "operator": ">="}, {"metric": "satisfaction_score", "threshold": 3.5, "operator": ">="}], "qualitative_criteria": [], "qualitative_minimum": 0}'::jsonb
),
(
  'complete',
  'Complete Programme',
  'All three packages combined for comprehensive transformation',
  9000000,
  16,
  3,
  ARRAY['win_back_campaign', 'review_collection', 'birthday_campaign', 'referral_program', 'vip_loyalty', 'post_purchase_followup', 'lead_nurture', 'ad_lead_nurture', 'whatsapp_flow_survey', 'abandoned_cart', 'order_status', 'cod_confirmation', 'cross_sell_upsell', 'catalog_browse'],
  ARRAY['welcome_message', 'out_of_office', 'satisfaction_gate', 'wonback_detection', 'new_lead_welcome', 'lead_scoring', 'email_nurture_trigger', 'cart_abandonment_trigger', 'order_status_update', 'cod_confirmation_flow', 'cross_sell_trigger', 'catalog_browse_trigger'],
  ARRAY['welcome_menu', 'satisfaction_collection', 'lead_qualification', 'ad_lead_capture', 'retargeting_flow', 'conversion_funnel'],
  'weekly',
  '[{"name": "Scale", "price": 750000, "monitoring_level": "Daily monitoring", "intervention_frequency": "Weekly optimisation"}]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb
),
(
  'unicorn',
  'Unicorn Programme',
  'Revenue share model with comprehensive transformation and ongoing partnership',
  3000000,
  16,
  3,
  ARRAY['win_back_campaign', 'review_collection', 'birthday_campaign', 'referral_program', 'vip_loyalty', 'post_purchase_followup', 'lead_nurture', 'ad_lead_nurture', 'whatsapp_flow_survey', 'abandoned_cart', 'order_status', 'cod_confirmation', 'cross_sell_upsell', 'catalog_browse'],
  ARRAY['welcome_message', 'out_of_office', 'satisfaction_gate', 'wonback_detection', 'new_lead_welcome', 'lead_scoring', 'email_nurture_trigger', 'cart_abandonment_trigger', 'order_status_update', 'cod_confirmation_flow', 'cross_sell_trigger', 'catalog_browse_trigger'],
  ARRAY['welcome_menu', 'satisfaction_collection', 'lead_qualification', 'ad_lead_capture', 'retargeting_flow', 'conversion_funnel'],
  'weekly',
  '[]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb
);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Aggregate execution metrics across clients
CREATE OR REPLACE FUNCTION aggregate_execution_metrics(
  p_time_range_start TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_time_range_end TIMESTAMPTZ DEFAULT now(),
  p_group_by TEXT DEFAULT 'metric_type'
)
RETURNS TABLE (
  group_key TEXT,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  count BIGINT,
  accounts_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE p_group_by
      WHEN 'metric_type' THEN em.metric_type
      WHEN 'metric_key' THEN em.metric_key
      ELSE em.metric_type
    END AS group_key,
    AVG(em.metric_value) AS avg_value,
    MIN(em.metric_value) AS min_value,
    MAX(em.metric_value) AS max_value,
    COUNT(*) AS count,
    COUNT(DISTINCT em.account_id) AS accounts_count
  FROM execution_metrics em
  WHERE em.period_start >= p_time_range_start
    AND em.period_end <= p_time_range_end
  GROUP BY 1
  ORDER BY avg_value DESC;
END;
$$;

-- Generate transition recommendation for an account
CREATE OR REPLACE FUNCTION generate_transition_recommendation(
  p_account_id UUID,
  p_package_config_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config package_configs;
  v_rules JSONB;
  v_quant_results JSONB := '[]'::jsonb;
  v_qual_results JSONB := '[]'::jsonb;
  v_quant_passed INTEGER := 0;
  v_quant_total INTEGER := 0;
  v_recommendation TEXT;
  v_criterion JSONB;
  v_metric_val NUMERIC;
BEGIN
  SELECT * INTO v_config FROM package_configs WHERE id = p_package_config_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Package config not found');
  END IF;

  v_rules := v_config.transition_rules;
  IF v_rules IS NULL OR v_rules = '{}'::jsonb THEN
    RETURN jsonb_build_object('recommendation', 'no_transition_rules', 'message', 'No transition rules defined for this package');
  END IF;

  -- Evaluate quantitative criteria
  FOR v_criterion IN SELECT * FROM jsonb_array_elements(v_rules->'quantitative_criteria')
  LOOP
    v_quant_total := v_quant_total + 1;
    SELECT AVG(metric_value) INTO v_metric_val
    FROM execution_metrics
    WHERE account_id = p_account_id
      AND metric_key = v_criterion->>'metric'
      AND period_end >= now() - INTERVAL '30 days';

    IF v_metric_val IS NOT NULL AND (
      (v_criterion->>'operator' = '>=' AND v_metric_val >= (v_criterion->>'threshold')::numeric) OR
      (v_criterion->>'operator' = '>' AND v_metric_val > (v_criterion->>'threshold')::numeric) OR
      (v_criterion->>'operator' = '<=' AND v_metric_val <= (v_criterion->>'threshold')::numeric) OR
      (v_criterion->>'operator' = '=' AND v_metric_val = (v_criterion->>'threshold')::numeric)
    ) THEN
      v_quant_passed := v_quant_passed + 1;
      v_quant_results := v_quant_results || jsonb_build_object(
        'metric', v_criterion->>'metric', 'passed', true, 'value', v_metric_val, 'threshold', v_criterion->>'threshold'
      );
    ELSE
      v_quant_results := v_quant_results || jsonb_build_object(
        'metric', v_criterion->>'metric', 'passed', false, 'value', COALESCE(v_metric_val, 0), 'threshold', v_criterion->>'threshold'
      );
    END IF;
  END LOOP;

  -- Determine recommendation
  IF v_quant_total > 0 AND v_quant_passed = v_quant_total THEN
    v_recommendation := 'strong_recommend';
  ELSIF v_quant_total > 0 AND v_quant_passed >= v_quant_total * 0.6 THEN
    v_recommendation := 'recommend';
  ELSIF v_quant_total > 0 AND v_quant_passed >= v_quant_total * 0.3 THEN
    v_recommendation := 'extend';
  ELSE
    v_recommendation := 'escalate';
  END IF;

  RETURN jsonb_build_object(
    'recommendation', v_recommendation,
    'quantitative_results', v_quant_results,
    'quantitative_passed', v_quant_passed,
    'quantitative_total', v_quant_total,
    'next_packages', v_rules->'next_packages',
    'qualitative_criteria', v_rules->'qualitative_criteria'
  );
END;
$$;
