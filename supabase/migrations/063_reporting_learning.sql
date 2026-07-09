-- Migration 063: Reporting engine, KB pending uploads, learning RPCs
-- Depends on: 062_funnel_engine.sql

-- ----------------------------------------------------------------
-- 1. kb_pending_uploads table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_pending_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'whatsapp',
  source_phone TEXT,
  extracted_pairs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','partial')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_pending_uploads_account
  ON kb_pending_uploads(account_id);
CREATE INDEX IF NOT EXISTS idx_kb_pending_uploads_status
  ON kb_pending_uploads(status);

ALTER TABLE kb_pending_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_uploads_account" ON kb_pending_uploads
  FOR ALL USING (is_account_member(account_id));

CREATE POLICY "kb_uploads_admin" ON kb_pending_uploads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- ----------------------------------------------------------------
-- 2. RPC: get_accounts_needing_reports
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_accounts_needing_reports()
RETURNS TABLE(account_id UUID, report_frequency TEXT, last_report_date DATE)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT fc.account_id, fc.report_frequency,
    (SELECT MAX(fr.period_end) FROM funnel_reports fr WHERE fr.account_id = fc.account_id)::DATE as last_report_date
  FROM funnel_configs fc
  WHERE fc.is_active = true;
END;
$$;

-- ----------------------------------------------------------------
-- 3. RPC: aggregate_preset_learnings
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION aggregate_preset_learnings(p_industry TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(agg)), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      pcl.parameter_name,
      pcl.new_value,
      COUNT(*) as total_changes,
      COUNT(*) FILTER (WHERE pcl.outcome_classification = 'positive') as positive,
      COUNT(*) FILTER (WHERE pcl.outcome_classification = 'negative') as negative,
      COUNT(*) FILTER (WHERE pcl.outcome_classification = 'mixed') as mixed,
      COUNT(*) FILTER (WHERE pcl.outcome_classification IS NULL) as pending,
      AVG(CASE WHEN pcl.outcome_value IS NOT NULL AND pcl.baseline_value IS NOT NULL AND pcl.baseline_value != 0
          THEN ((pcl.outcome_value - pcl.baseline_value) / pcl.baseline_value * 100)
          ELSE NULL END) as avg_improvement_pct
    FROM preset_change_log pcl
    JOIN funnel_configs fc ON fc.id = pcl.funnel_config_id
    WHERE fc.industry_preset = p_industry
    GROUP BY pcl.parameter_name, pcl.new_value
    HAVING COUNT(*) >= 1
    ORDER BY COUNT(*) FILTER (WHERE pcl.outcome_classification = 'positive') DESC
  ) agg;
  RETURN result;
END;
$$;
