-- ============================================================
-- 039_adaptive_recency_thresholds.sql
--
-- Extends product_score_settings with multi-tier dormancy
-- thresholds and adaptive recommendation fields that learn
-- from accumulated purchase_history data.
--
-- Segments:
--   Active       → purchased within hot_dormant_days
--   Hot Dormant  → between hot_dormant_days and warm_dormant_days
--   Warm Dormant → between warm_dormant_days and cold_dormant_days
--   Cold Dormant → beyond cold_dormant_days
--
-- The system starts with industry presets and progressively
-- refines thresholds using actual inter-purchase intervals.
-- ============================================================

-- 1) Industry preset enum
DO $$ BEGIN
  CREATE TYPE industry_preset AS ENUM (
    'fmcg',           -- Fast-moving consumer goods (30/60/120)
    'retail',         -- General retail (60/120/240)
    'b2b',            -- Business-to-business (90/180/365)
    'healthcare',     -- Healthcare/pharma (120/240/480)
    'real_estate',    -- Real estate/high-value (180/365/730)
    'custom'          -- User-defined thresholds
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add multi-tier threshold columns
ALTER TABLE product_score_settings
  ADD COLUMN IF NOT EXISTS industry industry_preset NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS hot_dormant_days integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS warm_dormant_days integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS cold_dormant_days integer NOT NULL DEFAULT 240,
  -- Adaptive recommendation fields (computed from data)
  ADD COLUMN IF NOT EXISTS adaptive_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommended_hot_days integer,
  ADD COLUMN IF NOT EXISTS recommended_warm_days integer,
  ADD COLUMN IF NOT EXISTS recommended_cold_days integer,
  ADD COLUMN IF NOT EXISTS data_sample_size integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_confidence numeric(3,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS last_analysis_at timestamptz;

-- 3) Ensure threshold ordering is valid
ALTER TABLE product_score_settings
  DROP CONSTRAINT IF EXISTS valid_threshold_order;
ALTER TABLE product_score_settings
  ADD CONSTRAINT valid_threshold_order CHECK (
    hot_dormant_days > 0
    AND warm_dormant_days > hot_dormant_days
    AND cold_dormant_days > warm_dormant_days
  );

-- 4) RPC: Analyze purchase recency from accumulated data
--    Computes inter-purchase intervals per contact, then derives
--    percentile-based threshold recommendations.
CREATE OR REPLACE FUNCTION analyze_purchase_recency(
  p_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH
  -- Step 1: Get all purchases ordered by contact and date
  ordered_purchases AS (
    SELECT
      contact_id,
      purchase_date,
      LAG(purchase_date) OVER (
        PARTITION BY contact_id ORDER BY purchase_date
      ) AS prev_purchase_date
    FROM purchase_history
    WHERE account_id = p_account_id
  ),
  -- Step 2: Calculate inter-purchase intervals (days between purchases)
  intervals AS (
    SELECT
      contact_id,
      (purchase_date - prev_purchase_date) AS interval_days
    FROM ordered_purchases
    WHERE prev_purchase_date IS NOT NULL
      AND (purchase_date - prev_purchase_date) > 0
  ),
  -- Step 3: Also compute days-since-last-purchase per contact
  last_purchases AS (
    SELECT
      contact_id,
      MAX(purchase_date) AS last_purchase,
      (CURRENT_DATE - MAX(purchase_date)) AS days_since_last,
      COUNT(*) AS purchase_count
    FROM purchase_history
    WHERE account_id = p_account_id
    GROUP BY contact_id
  ),
  -- Step 4: Compute percentiles from inter-purchase intervals
  interval_stats AS (
    SELECT
      COUNT(*) AS sample_size,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY interval_days) AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY interval_days) AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY interval_days) AS p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY interval_days) AS p95,
      AVG(interval_days)::numeric(10,1) AS mean_interval,
      MIN(interval_days) AS min_interval,
      MAX(interval_days) AS max_interval
    FROM intervals
  ),
  -- Step 5: Contact-level summary stats
  contact_stats AS (
    SELECT
      COUNT(*) AS total_contacts,
      COUNT(*) FILTER (WHERE purchase_count >= 2) AS repeat_customers,
      AVG(days_since_last)::numeric(10,1) AS avg_days_since_last,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY days_since_last) AS median_days_since_last
    FROM last_purchases
  )
  SELECT jsonb_build_object(
    'interval_stats', jsonb_build_object(
      'sample_size', COALESCE(i.sample_size, 0),
      'p50_days', ROUND(COALESCE(i.p50, 0)::numeric),
      'p75_days', ROUND(COALESCE(i.p75, 0)::numeric),
      'p90_days', ROUND(COALESCE(i.p90, 0)::numeric),
      'p95_days', ROUND(COALESCE(i.p95, 0)::numeric),
      'mean_days', COALESCE(i.mean_interval, 0),
      'min_days', COALESCE(i.min_interval, 0),
      'max_days', COALESCE(i.max_interval, 0)
    ),
    'contact_stats', jsonb_build_object(
      'total_contacts', COALESCE(c.total_contacts, 0),
      'repeat_customers', COALESCE(c.repeat_customers, 0),
      'avg_days_since_last', COALESCE(c.avg_days_since_last, 0),
      'median_days_since_last', ROUND(COALESCE(c.median_days_since_last, 0)::numeric)
    ),
    'recommendations', jsonb_build_object(
      -- Hot dormant: 1.5x the median inter-purchase interval (P50)
      -- This catches customers who are slightly overdue
      'hot_dormant_days', GREATEST(14, ROUND(COALESCE(i.p50 * 1.5, 60)::numeric)),
      -- Warm dormant: ~P75 interval (customers clearly overdue)
      'warm_dormant_days', GREATEST(30, ROUND(COALESCE(i.p75 * 1.5, 120)::numeric)),
      -- Cold dormant: ~P90 interval (customers significantly lapsed)
      'cold_dormant_days', GREATEST(60, ROUND(COALESCE(i.p90 * 1.5, 240)::numeric))
    ),
    'confidence', CASE
      -- Need at least 30 intervals for statistical significance
      WHEN COALESCE(i.sample_size, 0) >= 200 THEN 0.95
      WHEN COALESCE(i.sample_size, 0) >= 100 THEN 0.85
      WHEN COALESCE(i.sample_size, 0) >= 50  THEN 0.70
      WHEN COALESCE(i.sample_size, 0) >= 30  THEN 0.50
      WHEN COALESCE(i.sample_size, 0) >= 10  THEN 0.30
      ELSE 0.10
    END,
    'analyzed_at', NOW()
  ) INTO v_result
  FROM interval_stats i
  CROSS JOIN contact_stats c;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

ALTER FUNCTION analyze_purchase_recency(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION analyze_purchase_recency(UUID) TO authenticated;

-- 5) RPC: Apply adaptive recommendations to settings
CREATE OR REPLACE FUNCTION apply_adaptive_recency(
  p_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analysis JSONB;
  v_recs JSONB;
  v_confidence numeric;
BEGIN
  -- Run the analysis
  v_analysis := analyze_purchase_recency(p_account_id);
  v_recs := v_analysis->'recommendations';
  v_confidence := (v_analysis->>'confidence')::numeric;

  -- Update the settings with recommendations
  UPDATE product_score_settings
  SET
    recommended_hot_days = (v_recs->>'hot_dormant_days')::integer,
    recommended_warm_days = (v_recs->>'warm_dormant_days')::integer,
    recommended_cold_days = (v_recs->>'cold_dormant_days')::integer,
    data_sample_size = (v_analysis->'interval_stats'->>'sample_size')::integer,
    data_confidence = v_confidence,
    last_analysis_at = NOW(),
    -- If adaptive mode is on AND confidence is sufficient, auto-apply
    hot_dormant_days = CASE
      WHEN adaptive_enabled AND v_confidence >= 0.50
      THEN (v_recs->>'hot_dormant_days')::integer
      ELSE hot_dormant_days
    END,
    warm_dormant_days = CASE
      WHEN adaptive_enabled AND v_confidence >= 0.50
      THEN (v_recs->>'warm_dormant_days')::integer
      ELSE warm_dormant_days
    END,
    cold_dormant_days = CASE
      WHEN adaptive_enabled AND v_confidence >= 0.50
      THEN (v_recs->>'cold_dormant_days')::integer
      ELSE cold_dormant_days
    END,
    industry = CASE
      WHEN adaptive_enabled AND v_confidence >= 0.50
      THEN 'custom'::industry_preset
      ELSE industry
    END,
    updated_at = NOW()
  WHERE account_id = p_account_id;

  RETURN v_analysis;
END;
$$;

ALTER FUNCTION apply_adaptive_recency(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION apply_adaptive_recency(UUID) TO authenticated;
