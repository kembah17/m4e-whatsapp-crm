-- =============================================================================
-- Migration 091: CITE Phase 2 — Evidence & Provenance Tracking
-- Adds evidence tracking columns to campaigns and creates campaign_evidence table
-- =============================================================================

-- ─── Add columns to campaigns table ──────────────────────────────────────────

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS hypothesis_id UUID,
  ADD COLUMN IF NOT EXISTS pattern_sources UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_summary JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS provenance JSONB DEFAULT '{}';

COMMENT ON COLUMN campaigns.hypothesis_id IS 'Primary hypothesis being tested by this campaign';
COMMENT ON COLUMN campaigns.pattern_sources IS 'Pattern IDs that informed this campaign';
COMMENT ON COLUMN campaigns.evidence_summary IS 'Summary of evidence sources used';
COMMENT ON COLUMN campaigns.provenance IS 'Full provenance chain: who created, when, based on what';

-- ─── Add columns to campaign_templates table ─────────────────────────────────

ALTER TABLE campaign_templates
  ADD COLUMN IF NOT EXISTS evidence_basis TEXT,
  ADD COLUMN IF NOT EXISTS last_evidence_update TIMESTAMPTZ;

COMMENT ON COLUMN campaign_templates.evidence_basis IS 'Description of evidence supporting this template';
COMMENT ON COLUMN campaign_templates.last_evidence_update IS 'When evidence basis was last updated';

-- ─── Create campaign_evidence table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('pattern', 'learning', 'research', 'hypothesis', 'performance')),
  source_id UUID NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'informed_by' CHECK (relationship IN ('informed_by', 'tested_hypothesis', 'validated_pattern', 'contradicted_pattern')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE campaign_evidence IS 'Links campaigns to the patterns, learnings, and hypotheses that informed them';

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_campaign_evidence_campaign
  ON campaign_evidence(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_evidence_account
  ON campaign_evidence(account_id);

CREATE INDEX IF NOT EXISTS idx_campaign_evidence_source
  ON campaign_evidence(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_hypothesis
  ON campaigns(hypothesis_id)
  WHERE hypothesis_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_pattern_sources
  ON campaigns USING GIN(pattern_sources)
  WHERE pattern_sources != '{}';

-- ─── RLS Policies ────────────────────────────────────────────────────────────

ALTER TABLE campaign_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_evidence_select ON campaign_evidence
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM account_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY campaign_evidence_insert ON campaign_evidence
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY campaign_evidence_delete ON campaign_evidence
  FOR DELETE USING (
    account_id IN (
      SELECT account_id FROM account_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Service role bypass
CREATE POLICY campaign_evidence_service ON campaign_evidence
  FOR ALL USING (auth.role() = 'service_role');
