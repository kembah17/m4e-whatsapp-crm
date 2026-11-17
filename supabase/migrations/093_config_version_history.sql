-- Migration: Config Version History
-- Tracks changes to package_configs and campaign_templates

CREATE TABLE IF NOT EXISTS config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('package_config', 'campaign_template')),
  entity_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  changed_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_config_versions_entity
  ON config_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_config_versions_created
  ON config_versions(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_versions_unique_version
  ON config_versions(entity_type, entity_id, version_number);

-- RLS
ALTER TABLE config_versions ENABLE ROW LEVEL SECURITY;

-- Super admin can read all versions
CREATE POLICY "super_admin_read_versions" ON config_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM account_members am
      WHERE am.user_id = auth.uid()
      AND am.role = 'super_admin'
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "service_role_all_versions" ON config_versions
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE config_versions IS 'Tracks version history for package configs and campaign templates';
