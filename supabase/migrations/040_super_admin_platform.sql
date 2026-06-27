-- ============================================================
-- Migration 040: Super Admin Platform Management
-- ============================================================
-- Adds platform-level super admin capabilities for M4E staff
-- to manage all customer accounts from a central dashboard.
-- ============================================================

-- 1. Add is_super_admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Index for fast super admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin
  ON profiles (is_super_admin) WHERE is_super_admin = true;

-- 2. Platform-wide account overview (super admin only)
CREATE OR REPLACE FUNCTION get_platform_accounts_overview(
  p_search text DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  account_id uuid,
  account_name text,
  owner_user_id uuid,
  owner_name text,
  owner_email text,
  created_at timestamptz,
  member_count bigint,
  contact_count bigint,
  conversation_count bigint,
  deal_count bigint,
  broadcast_count bigint,
  automation_count bigint,
  whatsapp_connected boolean,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super admin required';
  END IF;

  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.name AS account_name,
    a.owner_user_id,
    owner_p.full_name AS owner_name,
    owner_p.email AS owner_email,
    a.created_at,
    -- Member count
    (SELECT count(*) FROM profiles p2 WHERE p2.account_id = a.id) AS member_count,
    -- Contact count
    (SELECT count(*) FROM contacts c WHERE c.account_id = a.id) AS contact_count,
    -- Conversation count
    (SELECT count(*) FROM conversations cv
     JOIN contacts ct ON ct.id = cv.contact_id
     WHERE ct.account_id = a.id) AS conversation_count,
    -- Deal count
    (SELECT count(*) FROM deals d
     JOIN pipelines pl ON pl.id = d.pipeline_id
     JOIN profiles dp ON dp.user_id = pl.user_id AND dp.account_id = a.id
     WHERE 1=1) AS deal_count,
    -- Broadcast count
    (SELECT count(*) FROM broadcasts b
     JOIN profiles bp ON bp.user_id = b.user_id AND bp.account_id = a.id) AS broadcast_count,
    -- Automation count
    (SELECT count(*) FROM automations au WHERE au.account_id = a.id) AS automation_count,
    -- WhatsApp connected
    EXISTS (
      SELECT 1 FROM whatsapp_config wc
      JOIN profiles wp ON wp.user_id = wc.user_id AND wp.account_id = a.id
      WHERE wc.status = 'connected'
    ) AS whatsapp_connected,
    -- Last activity (most recent message)
    (SELECT max(m.created_at) FROM messages m
     JOIN conversations cv2 ON cv2.id = m.conversation_id
     JOIN contacts ct2 ON ct2.id = cv2.contact_id
     WHERE ct2.account_id = a.id) AS last_activity_at
  FROM accounts a
  LEFT JOIN profiles owner_p ON owner_p.user_id = a.owner_user_id
  WHERE (
    p_search IS NULL
    OR a.name ILIKE '%' || p_search || '%'
    OR owner_p.full_name ILIKE '%' || p_search || '%'
    OR owner_p.email ILIKE '%' || p_search || '%'
  )
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN a.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc' THEN a.created_at END ASC,
    CASE WHEN p_sort_by = 'name' AND p_sort_dir = 'asc' THEN a.name END ASC,
    CASE WHEN p_sort_by = 'name' AND p_sort_dir = 'desc' THEN a.name END DESC,
    CASE WHEN p_sort_by = 'contacts' AND p_sort_dir = 'desc'
      THEN (SELECT count(*) FROM contacts c WHERE c.account_id = a.id) END DESC,
    CASE WHEN p_sort_by = 'contacts' AND p_sort_dir = 'asc'
      THEN (SELECT count(*) FROM contacts c WHERE c.account_id = a.id) END ASC,
    a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3. Platform metrics summary (super admin only)
CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super admin required';
  END IF;

  SELECT jsonb_build_object(
    'total_accounts', (SELECT count(*) FROM accounts),
    'total_users', (SELECT count(*) FROM profiles),
    'total_contacts', (SELECT count(*) FROM contacts),
    'total_conversations', (SELECT count(*) FROM conversations),
    'total_messages', (SELECT count(*) FROM messages),
    'total_deals', (SELECT count(*) FROM deals),
    'total_deal_value', COALESCE((SELECT sum(value) FROM deals WHERE status = 'open'), 0),
    'total_broadcasts', (SELECT count(*) FROM broadcasts),
    'total_automations', (SELECT count(*) FROM automations),
    'active_automations', (SELECT count(*) FROM automations WHERE is_active = true),
    'whatsapp_connected_accounts', (
      SELECT count(DISTINCT p.account_id)
      FROM whatsapp_config wc
      JOIN profiles p ON p.user_id = wc.user_id
      WHERE wc.status = 'connected'
    ),
    -- Time-based metrics
    'accounts_last_7d', (
      SELECT count(*) FROM accounts
      WHERE created_at >= now() - interval '7 days'
    ),
    'accounts_last_30d', (
      SELECT count(*) FROM accounts
      WHERE created_at >= now() - interval '30 days'
    ),
    'contacts_last_7d', (
      SELECT count(*) FROM contacts
      WHERE created_at >= now() - interval '7 days'
    ),
    'contacts_last_30d', (
      SELECT count(*) FROM contacts
      WHERE created_at >= now() - interval '30 days'
    ),
    'messages_last_7d', (
      SELECT count(*) FROM messages
      WHERE created_at >= now() - interval '7 days'
    ),
    'messages_last_30d', (
      SELECT count(*) FROM messages
      WHERE created_at >= now() - interval '30 days'
    ),
    'broadcasts_sent_last_30d', (
      SELECT count(*) FROM broadcasts
      WHERE status = 'sent'
        AND created_at >= now() - interval '30 days'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 4. Account detail for super admin
CREATE OR REPLACE FUNCTION get_platform_account_detail(p_account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super admin required';
  END IF;

  SELECT jsonb_build_object(
    'account', (
      SELECT jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'owner_user_id', a.owner_user_id,
        'created_at', a.created_at,
        'updated_at', a.updated_at,
        'default_currency', a.default_currency
      )
      FROM accounts a WHERE a.id = p_account_id
    ),
    'members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'full_name', p.full_name,
        'email', p.email,
        'avatar_url', p.avatar_url,
        'account_role', p.account_role,
        'created_at', p.created_at
      ) ORDER BY p.created_at), '[]'::jsonb)
      FROM profiles p WHERE p.account_id = p_account_id
    ),
    'stats', jsonb_build_object(
      'contacts', (SELECT count(*) FROM contacts WHERE account_id = p_account_id),
      'conversations', (
        SELECT count(*) FROM conversations cv
        JOIN contacts ct ON ct.id = cv.contact_id
        WHERE ct.account_id = p_account_id
      ),
      'open_conversations', (
        SELECT count(*) FROM conversations cv
        JOIN contacts ct ON ct.id = cv.contact_id
        WHERE ct.account_id = p_account_id AND cv.status = 'open'
      ),
      'messages_total', (
        SELECT count(*) FROM messages m
        JOIN conversations cv ON cv.id = m.conversation_id
        JOIN contacts ct ON ct.id = cv.contact_id
        WHERE ct.account_id = p_account_id
      ),
      'messages_last_7d', (
        SELECT count(*) FROM messages m
        JOIN conversations cv ON cv.id = m.conversation_id
        JOIN contacts ct ON ct.id = cv.contact_id
        WHERE ct.account_id = p_account_id
          AND m.created_at >= now() - interval '7 days'
      ),
      'deals_open', (
        SELECT count(*) FROM deals d
        JOIN pipelines pl ON pl.id = d.pipeline_id
        JOIN profiles dp ON dp.user_id = pl.user_id AND dp.account_id = p_account_id
        WHERE d.status = 'open'
      ),
      'deals_value', COALESCE((
        SELECT sum(d.value) FROM deals d
        JOIN pipelines pl ON pl.id = d.pipeline_id
        JOIN profiles dp ON dp.user_id = pl.user_id AND dp.account_id = p_account_id
        WHERE d.status = 'open'
      ), 0),
      'broadcasts_sent', (
        SELECT count(*) FROM broadcasts b
        JOIN profiles bp ON bp.user_id = b.user_id AND bp.account_id = p_account_id
        WHERE b.status = 'sent'
      ),
      'automations_active', (
        SELECT count(*) FROM automations WHERE account_id = p_account_id AND is_active = true
      ),
      'products', (SELECT count(*) FROM products WHERE account_id = p_account_id),
      'branches', (
        SELECT count(*) FROM branches WHERE account_id = p_account_id AND is_active = true
      )
    ),
    'whatsapp', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'phone_number_id', wc.phone_number_id,
        'status', wc.status,
        'connected_at', wc.connected_at,
        'registered_at', wc.registered_at
      )), '[]'::jsonb)
      FROM whatsapp_config wc
      JOIN profiles wp ON wp.user_id = wc.user_id AND wp.account_id = p_account_id
    ),
    'onboarding', jsonb_build_object(
      'has_whatsapp', EXISTS (
        SELECT 1 FROM whatsapp_config wc
        JOIN profiles wp ON wp.user_id = wc.user_id AND wp.account_id = p_account_id
        WHERE wc.status = 'connected'
      ),
      'has_contacts', EXISTS (
        SELECT 1 FROM contacts WHERE account_id = p_account_id
      ),
      'has_sent_broadcast', EXISTS (
        SELECT 1 FROM broadcasts b
        JOIN profiles bp ON bp.user_id = b.user_id AND bp.account_id = p_account_id
        WHERE b.status = 'sent'
      ),
      'has_automation', EXISTS (
        SELECT 1 FROM automations WHERE account_id = p_account_id AND is_active = true
      ),
      'has_pipeline', EXISTS (
        SELECT 1 FROM pipelines pl
        JOIN profiles pp ON pp.user_id = pl.user_id AND pp.account_id = p_account_id
      ),
      'has_products', EXISTS (
        SELECT 1 FROM products WHERE account_id = p_account_id
      )
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(activity ORDER BY activity->>'created_at' DESC), '[]'::jsonb)
      FROM (
        -- Recent messages
        SELECT jsonb_build_object(
          'type', 'message',
          'content', m.content_text,
          'sender_type', m.sender_type,
          'created_at', m.created_at
        ) AS activity
        FROM messages m
        JOIN conversations cv ON cv.id = m.conversation_id
        JOIN contacts ct ON ct.id = cv.contact_id
        WHERE ct.account_id = p_account_id
        ORDER BY m.created_at DESC
        LIMIT 10
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 5. Platform growth series for charts (super admin only)
CREATE OR REPLACE FUNCTION get_platform_growth_series(
  p_days int DEFAULT 30
)
RETURNS TABLE (
  day date,
  new_accounts bigint,
  new_contacts bigint,
  new_conversations bigint,
  messages_sent bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: super admin required';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (current_date - (p_days - 1)),
      current_date,
      '1 day'::interval
    )::date AS day
  )
  SELECT
    d.day,
    COALESCE((SELECT count(*) FROM accounts a WHERE a.created_at::date = d.day), 0) AS new_accounts,
    COALESCE((SELECT count(*) FROM contacts c WHERE c.created_at::date = d.day), 0) AS new_contacts,
    COALESCE((SELECT count(*) FROM conversations cv WHERE cv.created_at::date = d.day), 0) AS new_conversations,
    COALESCE((
      SELECT count(*) FROM messages m
      WHERE m.created_at::date = d.day AND m.sender_type = 'agent'
    ), 0) AS messages_sent
  FROM days d
  ORDER BY d.day;
END;
$$;

-- 6. Grant execute to authenticated users (RPC functions check is_super_admin internally)
GRANT EXECUTE ON FUNCTION get_platform_accounts_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_account_detail TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_growth_series TO authenticated;
