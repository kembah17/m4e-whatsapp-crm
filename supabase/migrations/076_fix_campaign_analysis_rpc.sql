-- Migration 076: Fix analyze_database_for_reactivation RPC function
-- Bug: Function references non-existent 'settings' JSONB column on product_score_settings
-- Fix: Use actual columns (hot_dormant_days, warm_dormant_days) instead
-- Impact: Unblocks campaign wizard Step 1 (Analyze) for all accounts

CREATE OR REPLACE FUNCTION analyze_database_for_reactivation(
  p_account_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_contacts integer;
  contacts_with_purchases integer;
  dormant_contacts integer;
  active_contacts integer;
  at_risk_contacts integer;
  total_revenue decimal;
  avg_purchase_value decimal;
  dormant_revenue_potential decimal;
BEGIN
  -- Total contacts
  SELECT COUNT(*) INTO total_contacts
  FROM contacts WHERE account_id = p_account_id;

  -- Contacts with purchase history
  SELECT COUNT(DISTINCT contact_id) INTO contacts_with_purchases
  FROM purchase_history WHERE account_id = p_account_id;

  -- Get recency thresholds from product_score_settings
  -- FIX: Use actual column names instead of non-existent JSONB 'settings' column
  WITH thresholds AS (
    SELECT
      COALESCE(hot_dormant_days, 90) AS active_days,
      COALESCE(warm_dormant_days, 180) AS at_risk_days
    FROM product_score_settings
    WHERE account_id = p_account_id
    LIMIT 1
  ),
  defaults AS (
    SELECT 90 AS active_days, 180 AS at_risk_days
  ),
  cfg AS (
    SELECT COALESCE(t.active_days, d.active_days) AS active_days,
           COALESCE(t.at_risk_days, d.at_risk_days) AS at_risk_days
    FROM defaults d LEFT JOIN thresholds t ON true
  ),
  contact_recency AS (
    SELECT
      ph.contact_id,
      MAX(ph.purchase_date) AS last_purchase,
      SUM(ph.amount) AS lifetime_value,
      COUNT(*) AS purchase_count
    FROM purchase_history ph
    WHERE ph.account_id = p_account_id
    GROUP BY ph.contact_id
  )
  SELECT
    COUNT(*) FILTER (WHERE cr.last_purchase >= CURRENT_DATE - (cfg.active_days || ' days')::interval),
    COUNT(*) FILTER (WHERE cr.last_purchase < CURRENT_DATE - (cfg.active_days || ' days')::interval
                       AND cr.last_purchase >= CURRENT_DATE - (cfg.at_risk_days || ' days')::interval),
    COUNT(*) FILTER (WHERE cr.last_purchase < CURRENT_DATE - (cfg.at_risk_days || ' days')::interval),
    COALESCE(SUM(cr.lifetime_value), 0),
    COALESCE(AVG(cr.lifetime_value / NULLIF(cr.purchase_count, 0)), 0),
    COALESCE(
      SUM(cr.lifetime_value / NULLIF(cr.purchase_count, 0))
      FILTER (WHERE cr.last_purchase < CURRENT_DATE - (cfg.at_risk_days || ' days')::interval),
      0
    )
  INTO active_contacts, at_risk_contacts, dormant_contacts,
       total_revenue, avg_purchase_value, dormant_revenue_potential
  FROM contact_recency cr, cfg;

  -- Build result
  result := jsonb_build_object(
    'total_contacts', total_contacts,
    'contacts_with_purchases', contacts_with_purchases,
    'contacts_without_purchases', total_contacts - contacts_with_purchases,
    'segments', jsonb_build_object(
      'active', jsonb_build_object('count', COALESCE(active_contacts, 0), 'label', 'Active Customers'),
      'at_risk', jsonb_build_object('count', COALESCE(at_risk_contacts, 0), 'label', 'At-Risk Customers'),
      'dormant', jsonb_build_object('count', COALESCE(dormant_contacts, 0), 'label', 'Dormant Customers')
    ),
    'revenue', jsonb_build_object(
      'total_lifetime', total_revenue,
      'avg_purchase_value', ROUND(avg_purchase_value, 2),
      'dormant_potential', ROUND(dormant_revenue_potential, 2)
    ),
    'recommendations', jsonb_build_array(
      CASE WHEN COALESCE(dormant_contacts, 0) > 0
        THEN jsonb_build_object(
          'campaign', 'win_back',
          'audience_size', dormant_contacts,
          'estimated_revenue', ROUND(dormant_revenue_potential * 0.15, 2),
          'priority', 'high'
        ) ELSE NULL END,
      CASE WHEN COALESCE(at_risk_contacts, 0) > 0
        THEN jsonb_build_object(
          'campaign', 'at_risk_nurture',
          'audience_size', at_risk_contacts,
          'estimated_revenue', ROUND(avg_purchase_value * at_risk_contacts * 0.25, 2),
          'priority', 'high'
        ) ELSE NULL END,
      CASE WHEN COALESCE(active_contacts, 0) > 0
        THEN jsonb_build_object(
          'campaign', 'upsell_cross_sell',
          'audience_size', active_contacts,
          'estimated_revenue', ROUND(avg_purchase_value * active_contacts * 0.10, 2),
          'priority', 'medium'
        ) ELSE NULL END
    ),
    'analyzed_at', now()
  );

  RETURN result;
END;
$$;
