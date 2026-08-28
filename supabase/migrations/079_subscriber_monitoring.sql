-- Migration 079: Platform-Only Subscriber Monitoring & Support System
-- Activity tracking, health scoring, automated interventions, onboarding

-- ============================================================
-- 1. Activity Events (engagement tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'general',
  page_path TEXT,
  feature_used TEXT,
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_events_account
  ON activity_events (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type
  ON activity_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_category
  ON activity_events (event_category);
CREATE INDEX IF NOT EXISTS idx_activity_events_created
  ON activity_events (created_at DESC);

-- Partition-friendly: auto-delete events older than 90 days
CREATE INDEX IF NOT EXISTS idx_activity_events_cleanup
  ON activity_events (created_at) WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================================
-- 2. Account Health Scores (computed daily)
-- ============================================================
CREATE TABLE IF NOT EXISTS account_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  login_score INTEGER NOT NULL DEFAULT 0 CHECK (login_score BETWEEN 0 AND 100),
  feature_breadth_score INTEGER NOT NULL DEFAULT 0 CHECK (feature_breadth_score BETWEEN 0 AND 100),
  contact_engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (contact_engagement_score BETWEEN 0 AND 100),
  campaign_activity_score INTEGER NOT NULL DEFAULT 0 CHECK (campaign_activity_score BETWEEN 0 AND 100),
  data_freshness_score INTEGER NOT NULL DEFAULT 0 CHECK (data_freshness_score BETWEEN 0 AND 100),
  support_sentiment_score INTEGER NOT NULL DEFAULT 0 CHECK (support_sentiment_score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL DEFAULT 'healthy' CHECK (risk_level IN ('healthy', 'watch', 'at_risk', 'critical')),
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
  days_since_login INTEGER,
  features_used_30d INTEGER DEFAULT 0,
  total_features_available INTEGER DEFAULT 0,
  messages_sent_30d INTEGER DEFAULT 0,
  contacts_total INTEGER DEFAULT 0,
  active_campaigns INTEGER DEFAULT 0,
  days_since_data_update INTEGER,
  open_tickets INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE account_health_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_health_scores_account
  ON account_health_scores (account_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_scores_risk
  ON account_health_scores (risk_level);
CREATE UNIQUE INDEX IF NOT EXISTS idx_health_scores_latest
  ON account_health_scores (account_id, scored_at DESC);

-- ============================================================
-- 3. Subscriber Interventions (automated outreach tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriber_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL,
  trigger_reason TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'in_app', 'sms')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'acted', 'failed', 'skipped')),
  message_template TEXT,
  message_content TEXT,
  health_score_at_trigger INTEGER,
  response_action TEXT,
  responded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriber_interventions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_interventions_account
  ON subscriber_interventions (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interventions_status
  ON subscriber_interventions (status) WHERE status IN ('pending', 'sent');
CREATE INDEX IF NOT EXISTS idx_interventions_type
  ON subscriber_interventions (intervention_type);
CREATE INDEX IF NOT EXISTS idx_interventions_scheduled
  ON subscriber_interventions (scheduled_for) WHERE status = 'pending';

DROP TRIGGER IF EXISTS set_updated_at ON subscriber_interventions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriber_interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. Platform Onboarding Progress (self-service subscribers)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  onboarding_type TEXT NOT NULL DEFAULT 'self_service' CHECK (onboarding_type IN ('self_service', 'post_package', 'referral')),
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 8,
  steps_completed JSONB DEFAULT '[]',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped_steps TEXT[] DEFAULT '{}',
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_onboarding ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_account
  ON platform_onboarding (account_id);

DROP TRIGGER IF EXISTS set_updated_at ON platform_onboarding;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON platform_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. RLS Policies
-- ============================================================
-- Activity events: users can read their own account events
CREATE POLICY "activity_events_read_own" ON activity_events
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

-- Activity events: users can insert their own events
CREATE POLICY "activity_events_insert_own" ON activity_events
  FOR INSERT TO authenticated
  WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

-- Health scores: users can read their own
CREATE POLICY "health_scores_read_own" ON account_health_scores
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

-- Interventions: users can read their own
CREATE POLICY "interventions_read_own" ON subscriber_interventions
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

-- Onboarding: users can read/update their own
CREATE POLICY "onboarding_read_own" ON platform_onboarding
  FOR SELECT TO authenticated
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "onboarding_update_own" ON platform_onboarding
  FOR UPDATE TO authenticated
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

-- Service role full access
CREATE POLICY "service_all_activity" ON activity_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_health" ON account_health_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_interventions" ON subscriber_interventions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_onboarding" ON platform_onboarding
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Helper: Get latest health score for an account
-- ============================================================
CREATE OR REPLACE FUNCTION get_latest_health_score(p_account_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'overall_score', h.overall_score,
    'risk_level', h.risk_level,
    'trend', h.trend,
    'login_score', h.login_score,
    'feature_breadth_score', h.feature_breadth_score,
    'contact_engagement_score', h.contact_engagement_score,
    'campaign_activity_score', h.campaign_activity_score,
    'data_freshness_score', h.data_freshness_score,
    'support_sentiment_score', h.support_sentiment_score,
    'days_since_login', h.days_since_login,
    'scored_at', h.scored_at
  )
  FROM account_health_scores h
  WHERE h.account_id = p_account_id
  ORDER BY h.scored_at DESC
  LIMIT 1;
$$;

-- ============================================================
-- 7. Helper: Get activity summary for an account
-- ============================================================
CREATE OR REPLACE FUNCTION get_activity_summary(p_account_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'unique_features', COUNT(DISTINCT feature_used),
    'unique_pages', COUNT(DISTINCT page_path),
    'unique_sessions', COUNT(DISTINCT session_id),
    'event_categories', jsonb_object_agg(
      COALESCE(event_category, 'unknown'),
      cat_count
    ),
    'period_days', p_days
  )
  FROM (
    SELECT event_category, COUNT(*) as cat_count
    FROM activity_events
    WHERE account_id = p_account_id
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY event_category
  ) sub
  CROSS JOIN (
    SELECT *
    FROM activity_events
    WHERE account_id = p_account_id
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
  ) events;
$$;

-- ============================================================
-- 8. Cleanup: Auto-delete old activity events (>90 days)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_activity_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM activity_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
