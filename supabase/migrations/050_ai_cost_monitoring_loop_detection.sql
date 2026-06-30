-- ============================================================
-- Migration 050: AI Cost Monitoring + Message Loop Detection
-- ============================================================

-- ============================================================
-- AI Usage Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('chatbot', 'sentiment', 'bulk_tagging', 'ghostwriter', 'intent_detection')),
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_account ON ai_usage_log(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_log(feature, created_at DESC);

-- ============================================================
-- AI Budget Settings per account
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE UNIQUE,
  monthly_budget_usd NUMERIC(10,2) DEFAULT 5.00,
  alert_threshold_pct INTEGER DEFAULT 80,
  hard_limit_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Message rate tracking (for persistence across restarts)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_rate_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_log_account ON message_rate_log(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_log_contact ON message_rate_log(contact_id, created_at DESC);

-- ============================================================
-- Circuit breaker state
-- ============================================================
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cooldown_until TIMESTAMPTZ NOT NULL,
  message_count INTEGER NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cb_state_active ON circuit_breaker_state(account_id, resolved, cooldown_until);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_rate_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- Account-scoped policies
CREATE POLICY ai_usage_log_account ON ai_usage_log FOR ALL
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY ai_budget_account ON ai_budget_settings FOR ALL
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY rate_log_account ON message_rate_log FOR ALL
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY cb_state_account ON circuit_breaker_state FOR ALL
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

-- Super admin policies
CREATE POLICY ai_usage_log_admin ON ai_usage_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true));
CREATE POLICY ai_budget_admin ON ai_budget_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true));
CREATE POLICY rate_log_admin ON message_rate_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true));
CREATE POLICY cb_state_admin ON circuit_breaker_state FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true));

-- ============================================================
-- RPC: Get AI usage summary for an account
-- ============================================================
CREATE OR REPLACE FUNCTION get_ai_usage_summary(p_account_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_cost_usd', COALESCE(SUM(estimated_cost_usd), 0),
    'total_input_tokens', COALESCE(SUM(input_tokens), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens), 0),
    'total_calls', COUNT(*),
    'by_feature', (
      SELECT COALESCE(json_agg(json_build_object(
        'feature', feature,
        'calls', cnt,
        'cost_usd', cost,
        'input_tokens', inp,
        'output_tokens', outp
      )), '[]'::json)
      FROM (
        SELECT feature, COUNT(*) as cnt, SUM(estimated_cost_usd) as cost,
               SUM(input_tokens) as inp, SUM(output_tokens) as outp
        FROM ai_usage_log
        WHERE account_id = p_account_id AND created_at >= now() - (p_days || ' days')::interval
        GROUP BY feature
      ) sub
    ),
    'daily_trend', (
      SELECT COALESCE(json_agg(json_build_object('date', d, 'cost_usd', c, 'calls', n) ORDER BY d), '[]'::json)
      FROM (
        SELECT created_at::date as d, SUM(estimated_cost_usd) as c, COUNT(*) as n
        FROM ai_usage_log
        WHERE account_id = p_account_id AND created_at >= now() - (p_days || ' days')::interval
        GROUP BY created_at::date
      ) sub2
    )
  ) INTO result
  FROM ai_usage_log
  WHERE account_id = p_account_id AND created_at >= now() - (p_days || ' days')::interval;
  RETURN result;
END;
$$;
