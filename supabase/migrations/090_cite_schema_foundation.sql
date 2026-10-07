-- =============================================================================
-- Migration 090: CITE Schema Foundation
-- Creates schema_objects, creative_patterns, creative_learnings, and
-- schema_object_relations tables for the CITE (Creative Intelligence
-- Through Evidence) system.
-- =============================================================================

-- ─── Schema Objects Store ────────────────────────────────────────────────────
-- Generic store for all CITE schema instances (BusinessProfile, ICPProfile,
-- CreativeConcept, Hook, etc.). The `data` JSONB column holds the full
-- schema-validated payload.

CREATE TABLE IF NOT EXISTS schema_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  schema_type TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  object_version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'validated', 'approved', 'archived', 'superseded')),
  confidence_score NUMERIC(3,2)
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_level TEXT
    CHECK (confidence_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  parent_id UUID REFERENCES schema_objects(id),
  created_by TEXT NOT NULL DEFAULT 'system',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Creative Patterns ───────────────────────────────────────────────────────
-- Extracted from schema_objects for fast querying. Stores reusable creative
-- patterns (hooks, emotions, story structures, etc.) with effectiveness data.

CREATE TABLE IF NOT EXISTS creative_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  schema_object_id UUID REFERENCES schema_objects(id),
  pattern_type TEXT NOT NULL
    CHECK (pattern_type IN (
      'hook', 'problem', 'emotion', 'story_structure', 'mechanism',
      'proof', 'visual_style', 'character', 'setting', 'pacing',
      'cta', 'offer', 'composite'
    )),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  trend TEXT NOT NULL DEFAULT 'unknown'
    CHECK (trend IN ('emerging', 'rising', 'stable', 'declining', 'unknown')),
  saturation TEXT NOT NULL DEFAULT 'medium'
    CHECK (saturation IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  effectiveness_evidence JSONB DEFAULT '{}',
  audience_fit JSONB DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  opportunity TEXT,
  recommended_use TEXT,
  industry TEXT,
  channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Creative Learnings ──────────────────────────────────────────────────────
-- Performance insights extracted from campaign data. Links winning/losing
-- patterns to commercial outcomes.

CREATE TABLE IF NOT EXISTS creative_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  schema_object_id UUID REFERENCES schema_objects(id),
  scope TEXT NOT NULL,
  observation TEXT NOT NULL,
  finding TEXT NOT NULL,
  winning_pattern JSONB,
  losing_pattern JSONB,
  diagnosis TEXT,
  commercial_effect JSONB,
  confidence_score NUMERIC(3,2),
  applicability JSONB,
  source_performance_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Schema Object Relations ─────────────────────────────────────────────────
-- Tracks relationships between schema objects (derived_from, references,
-- supersedes, validates, parent_of).

CREATE TABLE IF NOT EXISTS schema_object_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES schema_objects(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES schema_objects(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL
    CHECK (relation_type IN ('derived_from', 'references', 'supersedes', 'validates', 'parent_of')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, target_id, relation_type)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_schema_objects_account ON schema_objects(account_id);
CREATE INDEX idx_schema_objects_type ON schema_objects(schema_type);
CREATE INDEX idx_schema_objects_status ON schema_objects(lifecycle_status);
CREATE INDEX idx_schema_objects_data ON schema_objects USING GIN(data);
CREATE INDEX idx_schema_objects_parent ON schema_objects(parent_id);
CREATE INDEX idx_schema_objects_created_by ON schema_objects(created_by);

CREATE INDEX idx_creative_patterns_account ON creative_patterns(account_id);
CREATE INDEX idx_creative_patterns_type ON creative_patterns(pattern_type);
CREATE INDEX idx_creative_patterns_industry ON creative_patterns(industry);
CREATE INDEX idx_creative_patterns_channel ON creative_patterns(channel);
CREATE INDEX idx_creative_patterns_trend ON creative_patterns(trend);

CREATE INDEX idx_creative_learnings_account ON creative_learnings(account_id);
CREATE INDEX idx_creative_learnings_scope ON creative_learnings(scope);

CREATE INDEX idx_schema_relations_source ON schema_object_relations(source_id);
CREATE INDEX idx_schema_relations_target ON schema_object_relations(target_id);
CREATE INDEX idx_schema_relations_type ON schema_object_relations(relation_type);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE schema_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_object_relations ENABLE ROW LEVEL SECURITY;

-- Permissive policies (service role access; app enforces account scoping)
CREATE POLICY schema_objects_all ON schema_objects FOR ALL USING (true);
CREATE POLICY creative_patterns_all ON creative_patterns FOR ALL USING (true);
CREATE POLICY creative_learnings_all ON creative_learnings FOR ALL USING (true);
CREATE POLICY schema_relations_all ON schema_object_relations FOR ALL USING (true);

-- ─── Updated-at Triggers ─────────────────────────────────────────────────────
-- Reuses update_updated_at_column() from migration 001.

CREATE TRIGGER schema_objects_updated_at
  BEFORE UPDATE ON schema_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER creative_patterns_updated_at
  BEFORE UPDATE ON creative_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER creative_learnings_updated_at
  BEFORE UPDATE ON creative_learnings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
