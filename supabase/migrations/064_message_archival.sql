-- Migration 064: Message Archival & Infrastructure Monitoring
-- Adds archived_messages table, infrastructure_snapshots table, and helper RPCs

-- ============================================================
-- 1. Archived messages metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS archived_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  archive_path TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'local',
  message_count INTEGER NOT NULL DEFAULT 0,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  date_range_start TIMESTAMPTZ NOT NULL,
  date_range_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_archived_messages_account ON archived_messages(account_id);
CREATE INDEX idx_archived_messages_dates ON archived_messages(date_range_start, date_range_end);

-- ============================================================
-- 2. Infrastructure snapshots for trend tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS infrastructure_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_size_bytes BIGINT NOT NULL,
  message_count BIGINT NOT NULL,
  contact_count BIGINT NOT NULL,
  file_storage_bytes BIGINT NOT NULL,
  connection_count INTEGER NOT NULL,
  account_count INTEGER NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_infra_snapshots_time ON infrastructure_snapshots(snapshot_at DESC);

-- ============================================================
-- 3. Row Level Security
-- ============================================================
ALTER TABLE archived_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view archives" ON archived_messages
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "Super admins full access archives" ON archived_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Super admins full access infra" ON infrastructure_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================
-- 4. Helper RPCs for infrastructure monitoring
-- ============================================================
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database());
$$;

CREATE OR REPLACE FUNCTION get_storage_size()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(COALESCE((metadata->>'size')::bigint, 0)), 0)
  FROM storage.objects;
$$;

CREATE OR REPLACE FUNCTION get_connection_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(*)::integer FROM pg_stat_activity;
$$;
