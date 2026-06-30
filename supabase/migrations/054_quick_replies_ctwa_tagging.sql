-- Migration 054: Quick Replies, CTWA Nurture Tagging, AI Bulk Tagging
-- Batch 5 features

-- ============================================================
-- 1. Quick Replies
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  shortcut TEXT,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_account ON custom_quick_replies(account_id);
ALTER TABLE custom_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_account_access" ON custom_quick_replies
  FOR ALL USING (
    account_id = (SELECT account_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================================
-- 2. CTWA nurture status tracking on contacts
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ctwa_nurture_status TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ctwa_ad_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ctwa_first_seen TIMESTAMPTZ;

-- ============================================================
-- 3. AI bulk tagging suggestions log
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_tag_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  suggested_tags TEXT[] NOT NULL DEFAULT '{}',
  confidence REAL DEFAULT 0,
  reasoning TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_tags_account ON ai_tag_suggestions(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_tags_contact ON ai_tag_suggestions(contact_id);
ALTER TABLE ai_tag_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_tags_account_access" ON ai_tag_suggestions
  FOR ALL USING (
    account_id = (SELECT account_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );
