-- ============================================================
-- Migration 055: Import history tracking for OCR & multi-source import
-- ============================================================

-- Import history tracking
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('csv', 'ocr_image', 'text', 'google')),
  total_records INTEGER DEFAULT 0,
  imported INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ih_account ON import_history(account_id, created_at DESC);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY ih_account ON import_history FOR ALL
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY ih_admin ON import_history FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true));
