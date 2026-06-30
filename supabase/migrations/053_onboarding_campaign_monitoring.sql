-- ============================================================
-- 053: Onboarding Simplification + Campaign Monitoring
-- ============================================================

-- Part 1: Onboarding state tracking on accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS business_size TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Nigeria';

-- Part 2: Campaign execution tracking
CREATE TABLE IF NOT EXISTS campaign_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'replied', 'failed')),
  error_message TEXT,
  meta_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cml_campaign ON campaign_message_log(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_cml_contact ON campaign_message_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_cml_meta ON campaign_message_log(meta_message_id);

-- RPC for campaign stats
CREATE OR REPLACE FUNCTION get_campaign_stats(p_campaign_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'queued', COUNT(*) FILTER (WHERE status = 'queued'),
    'sent', COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read', 'replied')),
    'delivered', COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'replied')),
    'read', COUNT(*) FILTER (WHERE status IN ('read', 'replied')),
    'replied', COUNT(*) FILTER (WHERE status = 'replied'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'hourly', (
      SELECT json_agg(json_build_object(
        'hour', h, 'sent', s, 'delivered', d, 'read_count', r
      ) ORDER BY h)
      FROM (
        SELECT date_trunc('hour', sent_at) as h,
               COUNT(*) FILTER (WHERE status != 'failed') as s,
               COUNT(*) FILTER (WHERE status IN ('delivered','read','replied')) as d,
               COUNT(*) FILTER (WHERE status IN ('read','replied')) as r
        FROM campaign_message_log WHERE campaign_id = p_campaign_id AND sent_at IS NOT NULL
        GROUP BY date_trunc('hour', sent_at)
      ) sub
    )
  ) INTO result
  FROM campaign_message_log WHERE campaign_id = p_campaign_id;
  RETURN result;
END;
$$;

-- RLS
ALTER TABLE campaign_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY cml_account ON campaign_message_log FOR ALL
  USING (campaign_id IN (
    SELECT c.id FROM campaigns c
    WHERE c.account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY cml_admin ON campaign_message_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true));
