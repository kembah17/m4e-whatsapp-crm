-- 027_create_product_score_settings_table.sql
-- Per-account settings for the 4-factor product recommendation engine.
-- Weights must sum to 100 and be non-negative.

CREATE TABLE IF NOT EXISTS product_score_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  weight_reactivation_power integer NOT NULL DEFAULT 30,
  weight_revenue_potential integer NOT NULL DEFAULT 30,
  weight_margin_score integer NOT NULL DEFAULT 20,
  weight_dormant_match integer NOT NULL DEFAULT 20,
  lead_magnet_cost_threshold decimal(5,2) NOT NULL DEFAULT 0.15,
  dormancy_threshold_days integer NOT NULL DEFAULT 90,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weights_sum_100 CHECK (
    weight_reactivation_power + weight_revenue_potential +
    weight_margin_score + weight_dormant_match = 100
  ),
  CONSTRAINT weights_non_negative CHECK (
    weight_reactivation_power >= 0 AND weight_revenue_potential >= 0 AND
    weight_margin_score >= 0 AND weight_dormant_match >= 0
  )
);

ALTER TABLE product_score_settings ENABLE ROW LEVEL SECURITY;

-- Admin+ can view score settings
CREATE POLICY score_settings_select ON product_score_settings FOR SELECT
  USING (is_account_member(account_id, 'admin'));

-- Owner only can insert/update score settings
CREATE POLICY score_settings_insert ON product_score_settings FOR INSERT
  WITH CHECK (is_account_member(account_id, 'owner'));

CREATE POLICY score_settings_update ON product_score_settings FOR UPDATE
  USING (is_account_member(account_id, 'owner'));

-- Auto-update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON product_score_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON product_score_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
