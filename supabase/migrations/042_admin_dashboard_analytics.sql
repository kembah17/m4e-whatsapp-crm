-- ============================================================
-- Migration 042: Enhanced Admin Dashboard & Advanced Analytics
-- ============================================================
-- Adds subscription tier tracking, campaign monitoring,
-- system alerts, revenue overview, and advanced analytics
-- RPC functions for the super admin dashboard.
-- ============================================================

-- ============================================================
-- 1. Subscription tier columns on accounts
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_tier'
  ) THEN
    CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'growth', 'enterprise');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_status'
  ) THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'suspended', 'cancelled');
  END IF;
END $$;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_accounts_subscription_tier
  ON accounts (subscription_tier);
CREATE INDEX IF NOT EXISTS idx_accounts_subscription_status
  ON accounts (subscription_status);

-- ============================================================
-- 2. get_platform_campaigns_overview (super admin)
-- ============================================================
CREATE OR REPLACE FUNCTION get_platform_campaigns_overview(
  p_status text DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
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

  WITH campaign_stats AS (
    SELECT
      c.id AS campaign_id,
      c.name AS campaign_name,
      a.name AS account_name,
      a.id AS account_id,
      ct.name AS template_name,
      ct.category AS template_category,
      c.status,
      c.channel,
      c.created_at,
      c.started_at,
      c.completed_at,
      c.total_audience,
      COALESCE(sent.cnt, 0) AS total_sent,
      COALESCE(delivered.cnt, 0) AS total_delivered,
      COALESCE(read_ev.cnt, 0) AS total_read,
      COALESCE(replied.cnt, 0) AS total_replied,
      COALESCE(failed.cnt, 0) AS total_failed,
      CASE WHEN COALESCE(delivered.cnt, 0) > 0
        THEN ROUND(COALESCE(read_ev.cnt, 0)::decimal / delivered.cnt * 100, 1)
        ELSE 0 END AS open_rate,
      CASE WHEN COALESCE(read_ev.cnt, 0) > 0
        THEN ROUND(COALESCE(replied.cnt, 0)::decimal / read_ev.cnt * 100, 1)
        ELSE 0 END AS reply_rate
    FROM campaigns c
    JOIN accounts a ON a.id = c.account_id
    LEFT JOIN campaign_templates ct ON ct.id = c.template_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM campaign_events ce
      WHERE ce.campaign_id = c.id AND ce.event_type = 'sent'
    ) sent ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM campaign_events ce
      WHERE ce.campaign_id = c.id AND ce.event_type = 'delivered'
    ) delivered ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM campaign_events ce
      WHERE ce.campaign_id = c.id AND ce.event_type = 'read'
    ) read_ev ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM campaign_events ce
      WHERE ce.campaign_id = c.id AND ce.event_type = 'replied'
    ) replied ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM campaign_events ce
      WHERE ce.campaign_id = c.id AND ce.event_type = 'failed'
    ) failed ON true
    WHERE (p_status IS NULL OR c.status = p_status)
      AND (p_account_id IS NULL OR c.account_id = p_account_id)
      AND (p_category IS NULL OR ct.category = p_category)
    ORDER BY
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN c.created_at END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc' THEN c.created_at END ASC,
      CASE WHEN p_sort_by = 'open_rate' AND p_sort_dir = 'desc' THEN
        CASE WHEN COALESCE(delivered.cnt, 0) > 0
          THEN COALESCE(read_ev.cnt, 0)::decimal / delivered.cnt
          ELSE 0 END END DESC,
      CASE WHEN p_sort_by = 'reply_rate' AND p_sort_dir = 'desc' THEN
        CASE WHEN COALESCE(read_ev.cnt, 0) > 0
          THEN COALESCE(replied.cnt, 0)::decimal / read_ev.cnt
          ELSE 0 END END DESC,
      c.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ),
  total AS (
    SELECT COUNT(*) AS total_count
    FROM campaigns c
    LEFT JOIN campaign_templates ct ON ct.id = c.template_id
    WHERE (p_status IS NULL OR c.status = p_status)
      AND (p_account_id IS NULL OR c.account_id = p_account_id)
      AND (p_category IS NULL OR ct.category = p_category)
  )
  SELECT jsonb_build_object(
    'campaigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'campaign_id', cs.campaign_id,
        'campaign_name', cs.campaign_name,
        'account_name', cs.account_name,
        'account_id', cs.account_id,
        'template_name', cs.template_name,
        'template_category', cs.template_category,
        'status', cs.status,
        'channel', cs.channel,
        'created_at', cs.created_at,
        'started_at', cs.started_at,
        'completed_at', cs.completed_at,
        'total_audience', cs.total_audience,
        'total_sent', cs.total_sent,
        'total_delivered', cs.total_delivered,
        'total_read', cs.total_read,
        'total_replied', cs.total_replied,
        'total_failed', cs.total_failed,
        'open_rate', cs.open_rate,
        'reply_rate', cs.reply_rate
      ) ORDER BY cs.created_at DESC)
      FROM campaign_stats cs
    ), '[]'::jsonb),
    'total_count', (SELECT total_count FROM total)
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 3. get_platform_alerts (super admin)
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
        (a.subscription_tier = 'free' AND cnt.c >= 450)
        OR (a.subscription_tier = 'starter' AND cnt.c >= 2250)
        OR (a.subscription_tier = 'growth' AND cnt.c >= 9000)
      )
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 4. get_platform_revenue_overview (super admin)
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
      'free', (SELECT COUNT(*) FROM accounts WHERE subscription_tier = 'free'),
      'starter', (SELECT COUNT(*) FROM accounts WHERE subscription_tier = 'starter'),
      'growth', (SELECT COUNT(*) FROM accounts WHERE subscription_tier = 'growth'),
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
          WHEN 'free' THEN 0
          WHEN 'starter' THEN 25000
          WHEN 'growth' THEN 75000
          WHEN 'enterprise' THEN 150000
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
-- 5. get_platform_campaign_analytics (super admin)
-- ============================================================
CREATE OR REPLACE FUNCTION get_platform_campaign_analytics(
  p_days integer DEFAULT 30
)
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
    'template_performance', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'template_name', t.template_name,
        'template_category', t.template_category,
        'campaign_count', t.campaign_count,
        'total_sent', t.total_sent,
        'total_delivered', t.total_delivered,
        'total_read', t.total_read,
        'total_replied', t.total_replied,
        'open_rate', t.open_rate,
        'reply_rate', t.reply_rate
      ))
      FROM (
        SELECT
          ct.name AS template_name,
          ct.category AS template_category,
          COUNT(DISTINCT c.id) AS campaign_count,
          COUNT(ce.id) FILTER (WHERE ce.event_type = 'sent') AS total_sent,
          COUNT(ce.id) FILTER (WHERE ce.event_type = 'delivered') AS total_delivered,
          COUNT(ce.id) FILTER (WHERE ce.event_type = 'read') AS total_read,
          COUNT(ce.id) FILTER (WHERE ce.event_type = 'replied') AS total_replied,
          CASE WHEN COUNT(ce.id) FILTER (WHERE ce.event_type = 'delivered') > 0
            THEN ROUND(COUNT(ce.id) FILTER (WHERE ce.event_type = 'read')::decimal /
                 COUNT(ce.id) FILTER (WHERE ce.event_type = 'delivered') * 100, 1)
            ELSE 0 END AS open_rate,
          CASE WHEN COUNT(ce.id) FILTER (WHERE ce.event_type = 'read') > 0
            THEN ROUND(COUNT(ce.id) FILTER (WHERE ce.event_type = 'replied')::decimal /
                 COUNT(ce.id) FILTER (WHERE ce.event_type = 'read') * 100, 1)
            ELSE 0 END AS reply_rate
        FROM campaigns c
        JOIN campaign_templates ct ON ct.id = c.template_id
        LEFT JOIN campaign_events ce ON ce.campaign_id = c.id
        WHERE c.created_at > now() - (p_days || ' days')::interval
        GROUP BY ct.name, ct.category
        ORDER BY total_sent DESC
      ) t
    ), '[]'::jsonb),
    'volume_over_time', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day', d.day,
        'campaigns_created', d.campaigns_created,
        'messages_sent', d.messages_sent
      ) ORDER BY d.day)
      FROM (
        SELECT
          gs.day::date AS day,
          COUNT(DISTINCT c.id) AS campaigns_created,
          COUNT(ce.id) FILTER (WHERE ce.event_type = 'sent') AS messages_sent
        FROM generate_series(
          (now() - (p_days || ' days')::interval)::date,
          now()::date,
          '1 day'::interval
        ) gs(day)
        LEFT JOIN campaigns c ON c.created_at::date = gs.day::date
        LEFT JOIN campaign_events ce ON ce.campaign_id = c.id AND ce.created_at::date = gs.day::date
        GROUP BY gs.day
      ) d
    ), '[]'::jsonb),
    'channel_distribution', jsonb_build_object(
      'whatsapp', (SELECT COUNT(*) FROM campaigns WHERE channel = 'whatsapp' AND created_at > now() - (p_days || ' days')::interval),
      'email', (SELECT COUNT(*) FROM campaigns WHERE channel = 'email' AND created_at > now() - (p_days || ' days')::interval),
      'sms', (SELECT COUNT(*) FROM campaigns WHERE channel = 'sms' AND created_at > now() - (p_days || ' days')::interval),
      'auto', (SELECT COUNT(*) FROM campaigns WHERE channel = 'auto' AND created_at > now() - (p_days || ' days')::interval)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 6. get_platform_engagement_analytics (super admin)
-- ============================================================
CREATE OR REPLACE FUNCTION get_platform_engagement_analytics(
  p_days integer DEFAULT 30
)
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
    'message_heatmap', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day_of_week', h.dow,
        'hour_of_day', h.hod,
        'message_count', h.cnt
      ))
      FROM (
        SELECT
          EXTRACT(DOW FROM m.created_at) AS dow,
          EXTRACT(HOUR FROM m.created_at) AS hod,
          COUNT(*) AS cnt
        FROM messages m
        WHERE m.created_at > now() - (p_days || ' days')::interval
        GROUP BY EXTRACT(DOW FROM m.created_at), EXTRACT(HOUR FROM m.created_at)
      ) h
    ), '[]'::jsonb),
    'response_time_trend', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day', r.day,
        'avg_response_minutes', r.avg_mins
      ) ORDER BY r.day)
      FROM (
        SELECT
          m.created_at::date AS day,
          ROUND(AVG(EXTRACT(EPOCH FROM (
            m.created_at - LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at)
          )) / 60)::numeric, 1) AS avg_mins
        FROM messages m
        WHERE m.created_at > now() - (p_days || ' days')::interval
          AND m.sender_type = 'user'
        GROUP BY m.created_at::date
        HAVING AVG(EXTRACT(EPOCH FROM (
          m.created_at - LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at)
        ))) IS NOT NULL
      ) r
    ), '[]'::jsonb),
    'top_accounts_by_engagement', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'account_id', t.account_id,
        'account_name', t.account_name,
        'message_count', t.msg_count,
        'conversation_count', t.conv_count,
        'contact_count', t.contact_count
      ))
      FROM (
        SELECT
          a.id AS account_id,
          a.name AS account_name,
          COUNT(DISTINCT m.id) AS msg_count,
          COUNT(DISTINCT cv.id) AS conv_count,
          COUNT(DISTINCT ct.id) AS contact_count
        FROM accounts a
        JOIN contacts ct ON ct.account_id = a.id
        JOIN conversations cv ON cv.contact_id = ct.id
        JOIN messages m ON m.conversation_id = cv.id
        WHERE m.created_at > now() - (p_days || ' days')::interval
        GROUP BY a.id, a.name
        ORDER BY msg_count DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'conversation_resolution', jsonb_build_object(
      'total_conversations', (SELECT COUNT(*) FROM conversations cv JOIN contacts ct ON ct.id = cv.contact_id WHERE cv.created_at > now() - (p_days || ' days')::interval),
      'resolved_conversations', (SELECT COUNT(*) FROM conversations cv JOIN contacts ct ON ct.id = cv.contact_id WHERE cv.status = 'resolved' AND cv.created_at > now() - (p_days || ' days')::interval),
      'open_conversations', (SELECT COUNT(*) FROM conversations cv JOIN contacts ct ON ct.id = cv.contact_id WHERE cv.status = 'open' AND cv.created_at > now() - (p_days || ' days')::interval)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 7. get_platform_cohort_analytics (super admin)
-- ============================================================
CREATE OR REPLACE FUNCTION get_platform_cohort_analytics()
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
    'account_retention', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'cohort_month', r.cohort_month,
        'total_accounts', r.total_accounts,
        'active_now', r.active_now,
        'retention_rate', r.retention_rate
      ) ORDER BY r.cohort_month)
      FROM (
        SELECT
          TO_CHAR(a.created_at, 'YYYY-MM') AS cohort_month,
          COUNT(*) AS total_accounts,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM messages m
            JOIN conversations cv ON cv.id = m.conversation_id
            JOIN contacts ct ON ct.id = cv.contact_id
            WHERE ct.account_id = a.id
              AND m.created_at > now() - interval '30 days'
          )) AS active_now,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(
              COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM messages m
                JOIN conversations cv ON cv.id = m.conversation_id
                JOIN contacts ct ON ct.id = cv.contact_id
                WHERE ct.account_id = a.id
                  AND m.created_at > now() - interval '30 days'
              ))::decimal / COUNT(*) * 100, 1
            )
            ELSE 0 END AS retention_rate
        FROM accounts a
        GROUP BY TO_CHAR(a.created_at, 'YYYY-MM')
      ) r
    ), '[]'::jsonb),
    'feature_adoption', jsonb_build_object(
      'total_accounts', (SELECT COUNT(*) FROM accounts),
      'using_whatsapp', (SELECT COUNT(DISTINCT p.account_id) FROM profiles p JOIN whatsapp_config wc ON wc.user_id = p.user_id WHERE wc.status = 'connected'),
      'using_broadcasts', (SELECT COUNT(DISTINCT bp.account_id) FROM profiles bp JOIN broadcasts b ON b.user_id = bp.user_id WHERE b.status IN ('sent', 'completed')),
      'using_automations', (SELECT COUNT(DISTINCT au.account_id) FROM automations au WHERE au.is_active = true),
      'using_campaigns', (SELECT COUNT(DISTINCT c.account_id) FROM campaigns c WHERE c.status IN ('active', 'completed')),
      'using_deals', (SELECT COUNT(DISTINCT dp.account_id) FROM profiles dp JOIN pipelines pl ON pl.user_id = dp.user_id JOIN deals d ON d.pipeline_id = pl.id)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 8. Update account tier (super admin)
-- ============================================================
CREATE OR REPLACE FUNCTION update_account_subscription(
  p_account_id uuid,
  p_tier text DEFAULT NULL,
  p_status text DEFAULT NULL
)
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

  IF p_tier IS NOT NULL THEN
    UPDATE accounts SET subscription_tier = p_tier::subscription_tier WHERE id = p_account_id;
  END IF;

  IF p_status IS NOT NULL THEN
    UPDATE accounts SET subscription_status = p_status::subscription_status WHERE id = p_account_id;
  END IF;

  SELECT jsonb_build_object(
    'account_id', a.id,
    'subscription_tier', a.subscription_tier,
    'subscription_status', a.subscription_status
  ) INTO result
  FROM accounts a
  WHERE a.id = p_account_id;

  RETURN result;
END;
$$;

-- ============================================================
-- 9. Grant execute permissions
-- ============================================================
GRANT EXECUTE ON FUNCTION get_platform_campaigns_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_revenue_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_campaign_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_engagement_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_cohort_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION update_account_subscription TO authenticated;
