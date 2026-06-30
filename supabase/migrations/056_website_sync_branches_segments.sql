-- ============================================================
-- 056_website_sync_branches_segments.sql
-- Batch 7 (FINAL): Website Sync + Multi-Branch Enhancement +
-- SMS Testing + Advanced Segmentation
-- Idempotent. No data loss.
-- ============================================================

-- 1) Website Content Sync columns on accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS website_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_sync_api_key TEXT,
  ADD COLUMN IF NOT EXISTS website_sync_config JSONB DEFAULT '{"products": true, "testimonials": true, "stats": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS website_sync_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS website_sync_last_at TIMESTAMPTZ;

-- 2) Multi-Branch Enhancement — add columns to existing branches table
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"mon":{"open":"09:00","close":"17:00"},"tue":{"open":"09:00","close":"17:00"},"wed":{"open":"09:00","close":"17:00"},"thu":{"open":"09:00","close":"17:00"},"fri":{"open":"09:00","close":"17:00"}}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_reply_message TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Branch member assignments
CREATE TABLE IF NOT EXISTS branch_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'agent' CHECK (role IN ('manager', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_bm_branch ON branch_members(branch_id);
CREATE INDEX IF NOT EXISTS idx_bm_profile ON branch_members(profile_id);

ALTER TABLE branch_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bm_select ON branch_members;
CREATE POLICY bm_select ON branch_members FOR SELECT
  USING (branch_id IN (
    SELECT b.id FROM branches b
    WHERE b.account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS bm_insert ON branch_members;
CREATE POLICY bm_insert ON branch_members FOR INSERT
  WITH CHECK (branch_id IN (
    SELECT b.id FROM branches b
    WHERE b.account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin'))
  ));

DROP POLICY IF EXISTS bm_update ON branch_members;
CREATE POLICY bm_update ON branch_members FOR UPDATE
  USING (branch_id IN (
    SELECT b.id FROM branches b
    WHERE b.account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin'))
  ));

DROP POLICY IF EXISTS bm_delete ON branch_members;
CREATE POLICY bm_delete ON branch_members FOR DELETE
  USING (branch_id IN (
    SELECT b.id FROM branches b
    WHERE b.account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin'))
  ));

-- 3) SMS Test Log
CREATE TABLE IF NOT EXISTS sms_test_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_test_log_account ON sms_test_log(account_id);

ALTER TABLE sms_test_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_test_log_select ON sms_test_log;
CREATE POLICY sms_test_log_select ON sms_test_log FOR SELECT
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS sms_test_log_insert ON sms_test_log;
CREATE POLICY sms_test_log_insert ON sms_test_log FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

-- 4) Advanced Segmentation
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_segments_account ON segments(account_id);

ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS segments_select ON segments;
CREATE POLICY segments_select ON segments FOR SELECT
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS segments_insert ON segments;
CREATE POLICY segments_insert ON segments FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS segments_update ON segments;
CREATE POLICY segments_update ON segments FOR UPDATE
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS segments_delete ON segments;
CREATE POLICY segments_delete ON segments FOR DELETE
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS set_updated_at ON segments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
