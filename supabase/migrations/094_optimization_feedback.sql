-- Migration 066: Optimization Feedback System
-- Phase 3 of the Optimization Hub: connects learning systems to config editors
-- Tracks performance vs expectations, generates optimization insights, enables A/B tracking

-- ============================================================
-- 1. Optimization Insights Table
-- Stores auto-generated and manual optimization suggestions
-- linked to specific config versions
-- ============================================================
CREATE TABLE IF NOT EXISTS optimization_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What entity this insight is about
  entity_type text NOT NULL CHECK (entity_type IN ('package_config', 'campaign_template')),
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,

  -- Which config version produced this insight (links to config_versions)
  config_version_id uuid REFERENCES config_versions(id) ON DELETE SET NULL,

  -- Insight details
  insight_type text NOT NULL CHECK (insight_type IN (
    'performance_gap',      -- actual vs expected gap detected
    'trend_decline',        -- metric trending downward
    'trend_improvement',    -- metric trending upward
    'ab_result',            -- A/B test conclusion
    'suggestion',           -- optimization suggestion
    'anomaly',              -- unusual pattern detected
    'benchmark_comparison'  -- comparison against platform benchmarks
  )),

  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'success')),

  -- Human-readable insight
  title text NOT NULL,
  description text NOT NULL,

  -- Structured data for the insight
  metrics jsonb NOT NULL DEFAULT '{}',
  -- Example: { "metric": "reply_rate", "expected": 0.15, "actual": 0.08, "gap_pct": -46.7 }

  -- Suggested action
  suggested_action text,
  suggested_config_change jsonb,
  -- Example: { "field": "message_templates[0].body", "suggestion": "Add personalization" }

  -- Status tracking
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'applied', 'dismissed')),
  applied_at timestamptz,
  applied_by text,
  dismissed_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Performance Snapshots Table
-- Periodic snapshots of campaign/package performance
-- linked to config versions for before/after comparison
-- ============================================================
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type text NOT NULL CHECK (entity_type IN ('package_config', 'campaign_template')),
  entity_id uuid NOT NULL,

  -- Which config version was active during this snapshot
  config_version_id uuid REFERENCES config_versions(id) ON DELETE SET NULL,

  -- Snapshot period
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- Campaign template metrics
  campaigns_launched int NOT NULL DEFAULT 0,
  total_sent int NOT NULL DEFAULT 0,
  total_delivered int NOT NULL DEFAULT 0,
  total_read int NOT NULL DEFAULT 0,
  total_replied int NOT NULL DEFAULT 0,
  total_converted int NOT NULL DEFAULT 0,
  total_revenue numeric(12,2) NOT NULL DEFAULT 0,

  -- Computed rates
  delivery_rate numeric(5,4),
  read_rate numeric(5,4),
  reply_rate numeric(5,4),
  conversion_rate numeric(5,4),
  revenue_per_message numeric(10,2),

  -- Package metrics (for package_config type)
  active_clients int,
  milestone_completion_rate numeric(5,4),
  avg_client_satisfaction numeric(3,2),
  churn_rate numeric(5,4),

  -- Raw data for detailed analysis
  raw_metrics jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. A/B Test Tracking Table
-- Tracks config variations and their outcomes
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  description text,

  entity_type text NOT NULL CHECK (entity_type IN ('package_config', 'campaign_template')),
  entity_id uuid NOT NULL,

  -- Variant A (control) - the config version before change
  variant_a_version_id uuid REFERENCES config_versions(id) ON DELETE SET NULL,
  variant_a_label text NOT NULL DEFAULT 'Control',
  variant_a_snapshot_id uuid REFERENCES performance_snapshots(id) ON DELETE SET NULL,

  -- Variant B (treatment) - the config version after change
  variant_b_version_id uuid REFERENCES config_versions(id) ON DELETE SET NULL,
  variant_b_label text NOT NULL DEFAULT 'Treatment',
  variant_b_snapshot_id uuid REFERENCES performance_snapshots(id) ON DELETE SET NULL,

  -- Primary metric being tested
  primary_metric text NOT NULL,
  -- e.g., "reply_rate", "conversion_rate", "revenue_per_message"

  -- Test parameters
  min_sample_size int NOT NULL DEFAULT 100,
  confidence_level numeric(3,2) NOT NULL DEFAULT 0.95,

  -- Results
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'running', 'completed', 'inconclusive', 'cancelled'
  )),
  winner text CHECK (winner IN ('a', 'b', 'tie', NULL)),
  lift_percentage numeric(8,4),
  statistical_significance numeric(5,4),
  result_summary text,

  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_optimization_insights_entity 
  ON optimization_insights(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_optimization_insights_status 
  ON optimization_insights(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_optimization_insights_severity 
  ON optimization_insights(severity) WHERE severity IN ('critical', 'warning');
CREATE INDEX IF NOT EXISTS idx_optimization_insights_created 
  ON optimization_insights(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_snapshots_entity 
  ON performance_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_period 
  ON performance_snapshots(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_version 
  ON performance_snapshots(config_version_id);

CREATE INDEX IF NOT EXISTS idx_ab_tests_entity 
  ON ab_tests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status 
  ON ab_tests(status) WHERE status = 'running';

-- ============================================================
-- 5. RLS Policies
-- ============================================================
ALTER TABLE optimization_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin operations)
CREATE POLICY "service_role_optimization_insights" ON optimization_insights
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_performance_snapshots" ON performance_snapshots
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_ab_tests" ON ab_tests
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 6. Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS optimization_insights_updated_at ON optimization_insights;
CREATE TRIGGER optimization_insights_updated_at
  BEFORE UPDATE ON optimization_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS ab_tests_updated_at ON ab_tests;
CREATE TRIGGER ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
