-- =============================================================================
-- Migration 087: Ads Performance System
-- Stores Meta ad accounts, campaigns, and daily performance snapshots
-- =============================================================================

-- Ad Accounts linked to BGE accounts
CREATE TABLE IF NOT EXISTS ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  meta_ad_account_id TEXT NOT NULL,
  name TEXT,
  currency TEXT DEFAULT 'NGN',
  account_status INTEGER,
  business_name TEXT,
  timezone_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, meta_ad_account_id)
);

-- Ad Campaigns from Meta
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  meta_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, meta_campaign_id)
);

-- Performance snapshots (daily granularity)
CREATE TABLE IF NOT EXISTS ad_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  reach BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  cpc NUMERIC(12,2) DEFAULT 0,
  cpm NUMERIC(12,2) DEFAULT 0,
  cost_per_conversion NUMERIC(12,2) DEFAULT 0,
  actions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, campaign_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_ad_accounts_account ON ad_accounts(account_id);
CREATE INDEX idx_ad_campaigns_account ON ad_campaigns(account_id);
CREATE INDEX idx_ad_campaigns_ad_account ON ad_campaigns(ad_account_id);
CREATE INDEX idx_ad_perf_account_date ON ad_performance_snapshots(account_id, snapshot_date);
CREATE INDEX idx_ad_perf_campaign_date ON ad_performance_snapshots(campaign_id, snapshot_date);

-- RLS
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad accounts" ON ad_accounts FOR ALL USING (
  account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can view own ad campaigns" ON ad_campaigns FOR ALL USING (
  account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can view own ad performance" ON ad_performance_snapshots FOR ALL USING (
  account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
);

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ad_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ad_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
