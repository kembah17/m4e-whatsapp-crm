-- Migration 082: Package Campaign Orchestrator
-- Links package assignments to campaign template scheduling
-- Resolves slug mismatches between package_configs and campaign_templates

-- ============================================================
-- 1. Campaign Slug Mapping Table
-- ============================================================
-- Maps package_config campaign_slugs to campaign_template slugs
-- Needed because packages use different naming than templates
CREATE TABLE IF NOT EXISTS campaign_slug_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_slug TEXT NOT NULL,
  template_slug TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(package_slug)
);

-- Insert known mappings (package slug -> template slug)
-- Direct matches (same slug in both)
INSERT INTO campaign_slug_mapping (package_slug, template_slug, notes) VALUES
('review_collection', 'review_collection', 'Direct match'),
('birthday_campaign', 'birthday_campaign', 'Direct match'),
('referral_program', 'referral_program', 'Direct match'),
('abandoned_cart', 'abandoned_cart', 'Direct match'),
('order_status', 'order_status', 'Direct match'),
('cod_confirmation', 'cod_confirmation', 'Direct match'),
-- Mismatched slugs
('win_back_campaign', 'win_back', 'Package uses _campaign suffix'),
('vip_loyalty', 'vip_rewards', 'Different naming convention'),
('post_purchase_followup', 'post_purchase_thank_you', 'Different naming convention'),
('cross_sell_upsell', 'upsell_cross_sell', 'Reversed word order'),
('lead_nurture', 'at_risk_nurture', 'Maps to at-risk nurture template'),
('ad_lead_nurture', 'ad-lead-nurture', 'Hyphenated template slug'),
('satisfaction_collection', 'review_collection', 'No dedicated template, maps to review collection'),
('whatsapp_flow_survey', 'whatsapp-flow-survey', 'Hyphenated template slug'),
('catalog_browse', 'catalog-browse', 'Hyphenated template slug'),
('sentiment_recovery', 'sentiment-recovery', 'Hyphenated template slug')
ON CONFLICT (package_slug) DO NOTHING;

-- ============================================================
-- 2. Package Campaign Schedule Table
-- ============================================================
-- Tracks which campaigns should be created for each package assignment
-- and when they should be activated based on milestone progress
CREATE TABLE IF NOT EXISTS package_campaign_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_config_id UUID NOT NULL REFERENCES package_configs(id),
  campaign_template_id UUID REFERENCES campaign_templates(id),
  package_slug TEXT NOT NULL,
  template_slug TEXT,
  campaign_name TEXT NOT NULL,
  sequence_order INT NOT NULL DEFAULT 0,
  scheduled_week INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'created', 'active', 'completed', 'skipped', 'failed')),
  campaign_id UUID REFERENCES campaigns(id),
  trigger_id UUID REFERENCES campaign_triggers(id),
  auto_activate BOOLEAN DEFAULT false,
  activation_delay_hours INT DEFAULT 0,
  notes TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pcs_account ON package_campaign_schedule(account_id);
CREATE INDEX idx_pcs_status ON package_campaign_schedule(status);
CREATE INDEX idx_pcs_package ON package_campaign_schedule(package_config_id);
CREATE INDEX idx_pcs_week ON package_campaign_schedule(scheduled_week);
CREATE INDEX idx_pcs_account_package ON package_campaign_schedule(account_id, package_config_id);

-- ============================================================
-- 3. RLS Policies
-- ============================================================
ALTER TABLE package_campaign_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_slug_mapping ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by API routes)
CREATE POLICY "Service role full access on package_campaign_schedule"
  ON package_campaign_schedule FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on campaign_slug_mapping"
  ON campaign_slug_mapping FOR ALL
  USING (true) WITH CHECK (true);

-- Account members can read their own schedules
CREATE POLICY "Account members can view campaign schedules"
  ON package_campaign_schedule FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

-- Anyone can read slug mappings (reference data)
CREATE POLICY "Anyone can read slug mappings"
  ON campaign_slug_mapping FOR SELECT
  USING (true);

-- ============================================================
-- 4. Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_pcs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pcs_updated_at
  BEFORE UPDATE ON package_campaign_schedule
  FOR EACH ROW EXECUTE FUNCTION update_pcs_updated_at();
