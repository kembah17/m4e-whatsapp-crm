-- Migration 072: Operational Limits Monitoring
-- Date: 2026-07-28
-- Purpose: Fix DB defaults, auto-provisioning, enhanced usage view, limit check functions

-- ============================================================
-- 3A. Fix DB column defaults to match Starter tier
-- ============================================================
ALTER TABLE feature_access_config ALTER COLUMN max_broadcasts_per_month SET DEFAULT 500;
ALTER TABLE feature_access_config ALTER COLUMN max_campaigns SET DEFAULT 4;

-- ============================================================
-- 3B. Create get_tier_defaults() function
-- ============================================================
CREATE OR REPLACE FUNCTION get_tier_defaults(p_tier TEXT)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'starter' THEN '{
      "max_contacts":500,"max_team_members":2,"max_branches":1,"max_pipelines":1,
      "max_products":50,"max_broadcasts_per_month":500,"max_campaigns":4,
      "max_automations":3,"max_whatsapp_flows":0,"max_ai_chatbot_msgs_per_month":0,
      "max_ai_queries_per_day":10,"max_invoices_per_month":20
    }'::jsonb
    WHEN 'professional' THEN '{
      "max_contacts":2000,"max_team_members":5,"max_branches":3,"max_pipelines":3,
      "max_products":200,"max_broadcasts_per_month":2000,"max_campaigns":10,
      "max_automations":10,"max_whatsapp_flows":3,"max_ai_chatbot_msgs_per_month":100,
      "max_ai_queries_per_day":50,"max_invoices_per_month":100
    }'::jsonb
    WHEN 'business' THEN '{
      "max_contacts":999999,"max_team_members":999999,"max_branches":999999,"max_pipelines":999999,
      "max_products":999999,"max_broadcasts_per_month":10000,"max_campaigns":14,
      "max_automations":999999,"max_whatsapp_flows":999999,"max_ai_chatbot_msgs_per_month":999999,
      "max_ai_queries_per_day":200,"max_invoices_per_month":500
    }'::jsonb
    WHEN 'enterprise' THEN '{
      "max_contacts":999999,"max_team_members":999999,"max_branches":999999,"max_pipelines":999999,
      "max_products":999999,"max_broadcasts_per_month":999999,"max_campaigns":999999,
      "max_automations":999999,"max_whatsapp_flows":999999,"max_ai_chatbot_msgs_per_month":999999,
      "max_ai_queries_per_day":999999,"max_invoices_per_month":999999
    }'::jsonb
    ELSE get_tier_defaults('starter')
  END;
END;
$$;

-- ============================================================
-- 3C. Auto-provisioning trigger
-- ============================================================
CREATE OR REPLACE FUNCTION auto_provision_feature_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  defaults jsonb;
BEGIN
  defaults := get_tier_defaults(COALESCE(NEW.subscription_tier::text, 'starter'));

  INSERT INTO feature_access_config (
    account_id, current_tier,
    max_contacts, max_team_members, max_branches, max_pipelines, max_products,
    max_broadcasts_per_month, max_campaigns, max_automations,
    max_whatsapp_flows, max_ai_chatbot_msgs_per_month,
    max_ai_queries_per_day, max_invoices_per_month
  ) VALUES (
    NEW.id, COALESCE(NEW.subscription_tier::text, 'starter'),
    (defaults->>'max_contacts')::int, (defaults->>'max_team_members')::int,
    (defaults->>'max_branches')::int, (defaults->>'max_pipelines')::int,
    (defaults->>'max_products')::int, (defaults->>'max_broadcasts_per_month')::int,
    (defaults->>'max_campaigns')::int, (defaults->>'max_automations')::int,
    (defaults->>'max_whatsapp_flows')::int, (defaults->>'max_ai_chatbot_msgs_per_month')::int,
    (defaults->>'max_ai_queries_per_day')::int, (defaults->>'max_invoices_per_month')::int
  ) ON CONFLICT (account_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_provision_feature_access ON accounts;

CREATE TRIGGER trg_auto_provision_feature_access
  AFTER INSERT ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION auto_provision_feature_access();

-- ============================================================
-- 3D. Provision existing accounts
-- ============================================================
INSERT INTO feature_access_config (
  account_id, current_tier,
  max_contacts, max_team_members, max_branches, max_pipelines, max_products,
  max_broadcasts_per_month, max_campaigns, max_automations,
  max_whatsapp_flows, max_ai_chatbot_msgs_per_month,
  max_ai_queries_per_day, max_invoices_per_month
)
SELECT
  a.id, COALESCE(a.subscription_tier::text, 'starter'),
  (d->>'max_contacts')::int, (d->>'max_team_members')::int,
  (d->>'max_branches')::int, (d->>'max_pipelines')::int,
  (d->>'max_products')::int, (d->>'max_broadcasts_per_month')::int,
  (d->>'max_campaigns')::int, (d->>'max_automations')::int,
  (d->>'max_whatsapp_flows')::int, (d->>'max_ai_chatbot_msgs_per_month')::int,
  (d->>'max_ai_queries_per_day')::int, (d->>'max_invoices_per_month')::int
FROM accounts a
CROSS JOIN LATERAL get_tier_defaults(COALESCE(a.subscription_tier::text, 'starter')) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM feature_access_config fac WHERE fac.account_id = a.id
);

-- ============================================================
-- 3E. Enhanced v_account_limit_usage view
-- ============================================================
DROP VIEW IF EXISTS v_account_limit_usage;

CREATE OR REPLACE VIEW v_account_limit_usage AS
SELECT
  a.id AS account_id,
  a.name AS account_name,
  a.subscription_tier,
  a.subscription_status,
  fac.current_tier,
  -- Contacts
  fac.max_contacts,
  (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id)::int AS current_contacts,
  -- Team Members
  fac.max_team_members,
  (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id)::int AS current_team_members,
  -- Branches
  fac.max_branches,
  (SELECT COUNT(*) FROM branches b WHERE b.account_id = a.id)::int AS current_branches,
  -- Pipelines
  fac.max_pipelines,
  (SELECT COUNT(*) FROM pipelines pl WHERE pl.account_id = a.id)::int AS current_pipelines,
  -- Products
  fac.max_products,
  (SELECT COUNT(*) FROM products pr WHERE pr.account_id = a.id)::int AS current_products,
  -- Broadcasts (this month)
  fac.max_broadcasts_per_month,
  (SELECT COUNT(*) FROM broadcasts br
   WHERE br.account_id = a.id
   AND br.created_at >= date_trunc('month', now()))::int AS current_broadcasts_this_month,
  -- Campaigns (non-archived)
  fac.max_campaigns,
  (SELECT COUNT(*) FROM campaigns ca
   WHERE ca.account_id = a.id
   AND ca.status != 'archived')::int AS current_campaigns,
  -- Automations (active)
  fac.max_automations,
  (SELECT COUNT(*) FROM automations au
   WHERE au.account_id = a.id
   AND au.is_active = true)::int AS current_automations,
  -- WhatsApp Flows
  fac.max_whatsapp_flows,
  (SELECT COUNT(*) FROM whatsapp_flows wf
   WHERE wf.account_id = a.id)::int AS current_whatsapp_flows,
  -- AI Chatbot Messages (this month)
  fac.max_ai_chatbot_msgs_per_month,
  (SELECT COUNT(*) FROM ai_conversation_logs acl
   WHERE acl.account_id = a.id
   AND acl.created_at >= date_trunc('month', now()))::int AS current_ai_chatbot_msgs_this_month,
  -- AI Queries (today)
  fac.max_ai_queries_per_day,
  (SELECT COUNT(*) FROM ai_conversation_logs acl2
   WHERE acl2.account_id = a.id
   AND acl2.created_at >= date_trunc('day', now()))::int AS current_ai_queries_today,
  -- Invoices (this month)
  fac.max_invoices_per_month,
  (SELECT COUNT(*) FROM invoices inv
   WHERE inv.account_id = a.id
   AND inv.created_at >= date_trunc('month', now()))::int AS current_invoices_this_month
FROM accounts a
LEFT JOIN feature_access_config fac ON fac.account_id = a.id;

-- ============================================================
-- 3F. Limit check function
-- ============================================================
CREATE OR REPLACE FUNCTION check_account_limit(
  p_account_id UUID,
  p_limit_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usage_row RECORD;
  max_val INT;
  current_val INT;
  pct NUMERIC;
BEGIN
  SELECT * INTO usage_row FROM v_account_limit_usage WHERE account_id = p_account_id;

  IF usage_row IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_config');
  END IF;

  CASE p_limit_name
    WHEN 'contacts' THEN max_val := usage_row.max_contacts; current_val := usage_row.current_contacts;
    WHEN 'team_members' THEN max_val := usage_row.max_team_members; current_val := usage_row.current_team_members;
    WHEN 'branches' THEN max_val := usage_row.max_branches; current_val := usage_row.current_branches;
    WHEN 'pipelines' THEN max_val := usage_row.max_pipelines; current_val := usage_row.current_pipelines;
    WHEN 'products' THEN max_val := usage_row.max_products; current_val := usage_row.current_products;
    WHEN 'broadcasts' THEN max_val := usage_row.max_broadcasts_per_month; current_val := usage_row.current_broadcasts_this_month;
    WHEN 'campaigns' THEN max_val := usage_row.max_campaigns; current_val := usage_row.current_campaigns;
    WHEN 'automations' THEN max_val := usage_row.max_automations; current_val := usage_row.current_automations;
    WHEN 'whatsapp_flows' THEN max_val := usage_row.max_whatsapp_flows; current_val := usage_row.current_whatsapp_flows;
    WHEN 'ai_chatbot_msgs' THEN max_val := usage_row.max_ai_chatbot_msgs_per_month; current_val := usage_row.current_ai_chatbot_msgs_this_month;
    WHEN 'ai_queries' THEN max_val := usage_row.max_ai_queries_per_day; current_val := usage_row.current_ai_queries_today;
    WHEN 'invoices' THEN max_val := usage_row.max_invoices_per_month; current_val := usage_row.current_invoices_this_month;
    ELSE RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_limit');
  END CASE;

  pct := CASE WHEN max_val > 0 THEN (current_val::numeric / max_val * 100) ELSE 0 END;

  RETURN jsonb_build_object(
    'allowed', current_val < max_val,
    'current', current_val,
    'max', max_val,
    'percentage', round(pct, 1),
    'tier', usage_row.current_tier,
    'approaching_limit', pct >= 80,
    'at_limit', current_val >= max_val
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_account_limit TO authenticated;

-- ============================================================
-- 3G. Approaching-limits alert function
-- ============================================================
CREATE OR REPLACE FUNCTION get_approaching_limits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Require super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super admin required';
  END IF;

  SELECT COALESCE(jsonb_agg(alerts ORDER BY pct DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'account_id', v.account_id,
      'account_name', v.account_name,
      'tier', v.current_tier,
      'limit_name', lim.name,
      'current', lim.current_val,
      'max', lim.max_val,
      'percentage', round(lim.current_val::numeric / NULLIF(lim.max_val, 0) * 100, 1)
    ) AS alerts,
    round(lim.current_val::numeric / NULLIF(lim.max_val, 0) * 100, 1) AS pct
    FROM v_account_limit_usage v,
    LATERAL (
      VALUES
        ('contacts', v.current_contacts, v.max_contacts),
        ('team_members', v.current_team_members, v.max_team_members),
        ('branches', v.current_branches, v.max_branches),
        ('pipelines', v.current_pipelines, v.max_pipelines),
        ('products', v.current_products, v.max_products),
        ('broadcasts', v.current_broadcasts_this_month, v.max_broadcasts_per_month),
        ('campaigns', v.current_campaigns, v.max_campaigns),
        ('automations', v.current_automations, v.max_automations),
        ('whatsapp_flows', v.current_whatsapp_flows, v.max_whatsapp_flows),
        ('ai_chatbot_msgs', v.current_ai_chatbot_msgs_this_month, v.max_ai_chatbot_msgs_per_month),
        ('ai_queries', v.current_ai_queries_today, v.max_ai_queries_per_day),
        ('invoices', v.current_invoices_this_month, v.max_invoices_per_month)
    ) AS lim(name, current_val, max_val)
    WHERE lim.max_val IS NOT NULL
      AND lim.max_val < 999999
      AND lim.max_val > 0
      AND (lim.current_val::numeric / lim.max_val * 100) >= 80
  ) sub;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_approaching_limits TO authenticated;
