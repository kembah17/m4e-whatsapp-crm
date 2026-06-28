-- 049_rls_policies_and_campaign_templates.sql
--
-- This migration:
--   0. Ensures is_super_admin column exists on profiles (from migration 040)
--   A. Adds RLS policies for 5 tables from migration 047 (qr_templates,
--      whatsapp_flows, catalog_sync_status, ctwa_leads, message_sentiments)
--   B. Adds super-admin SELECT policies for 5 monitoring tables from migration 045
--      (system_logs, system_alerts, health_snapshots, security_events, api_metrics_hourly)
--   C. Re-runs campaign template operations from migration 048 (which failed due to
--      an environmental error unrelated to the SQL content)
--
-- All operations are idempotent (DROP IF EXISTS + CREATE, ON CONFLICT DO NOTHING).
-- ============================================================

-- ============================================================
-- PART 0: Ensure is_super_admin column exists on profiles
-- ============================================================
-- Migration 040 adds this column, but it may not have been applied.
-- IF NOT EXISTS makes this safe to run regardless.
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_super_admin
  ON profiles (is_super_admin) WHERE is_super_admin = true;

-- ============================================================
-- PART A: RLS Policies for Migration 047 Tables
-- ============================================================
-- These 5 tables have account_id referencing accounts(id).
-- Uses the existing is_account_member(account_id) function from migration 017.
-- Pattern: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================

-- -------------------------------------------------------
-- A1. qr_templates
-- -------------------------------------------------------
DROP POLICY IF EXISTS "qr_templates_select" ON qr_templates;
CREATE POLICY "qr_templates_select" ON qr_templates
  FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS "qr_templates_insert" ON qr_templates;
CREATE POLICY "qr_templates_insert" ON qr_templates
  FOR INSERT WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS "qr_templates_update" ON qr_templates;
CREATE POLICY "qr_templates_update" ON qr_templates
  FOR UPDATE USING (is_account_member(account_id));

DROP POLICY IF EXISTS "qr_templates_delete" ON qr_templates;
CREATE POLICY "qr_templates_delete" ON qr_templates
  FOR DELETE USING (is_account_member(account_id));

-- -------------------------------------------------------
-- A2. whatsapp_flows
-- -------------------------------------------------------
DROP POLICY IF EXISTS "whatsapp_flows_select" ON whatsapp_flows;
CREATE POLICY "whatsapp_flows_select" ON whatsapp_flows
  FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS "whatsapp_flows_insert" ON whatsapp_flows;
CREATE POLICY "whatsapp_flows_insert" ON whatsapp_flows
  FOR INSERT WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS "whatsapp_flows_update" ON whatsapp_flows;
CREATE POLICY "whatsapp_flows_update" ON whatsapp_flows
  FOR UPDATE USING (is_account_member(account_id));

DROP POLICY IF EXISTS "whatsapp_flows_delete" ON whatsapp_flows;
CREATE POLICY "whatsapp_flows_delete" ON whatsapp_flows
  FOR DELETE USING (is_account_member(account_id));

-- -------------------------------------------------------
-- A3. catalog_sync_status
-- -------------------------------------------------------
DROP POLICY IF EXISTS "catalog_sync_status_select" ON catalog_sync_status;
CREATE POLICY "catalog_sync_status_select" ON catalog_sync_status
  FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS "catalog_sync_status_insert" ON catalog_sync_status;
CREATE POLICY "catalog_sync_status_insert" ON catalog_sync_status
  FOR INSERT WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS "catalog_sync_status_update" ON catalog_sync_status;
CREATE POLICY "catalog_sync_status_update" ON catalog_sync_status
  FOR UPDATE USING (is_account_member(account_id));

DROP POLICY IF EXISTS "catalog_sync_status_delete" ON catalog_sync_status;
CREATE POLICY "catalog_sync_status_delete" ON catalog_sync_status
  FOR DELETE USING (is_account_member(account_id));

-- -------------------------------------------------------
-- A4. ctwa_leads
-- -------------------------------------------------------
DROP POLICY IF EXISTS "ctwa_leads_select" ON ctwa_leads;
CREATE POLICY "ctwa_leads_select" ON ctwa_leads
  FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS "ctwa_leads_insert" ON ctwa_leads;
CREATE POLICY "ctwa_leads_insert" ON ctwa_leads
  FOR INSERT WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS "ctwa_leads_update" ON ctwa_leads;
CREATE POLICY "ctwa_leads_update" ON ctwa_leads
  FOR UPDATE USING (is_account_member(account_id));

DROP POLICY IF EXISTS "ctwa_leads_delete" ON ctwa_leads;
CREATE POLICY "ctwa_leads_delete" ON ctwa_leads
  FOR DELETE USING (is_account_member(account_id));

-- -------------------------------------------------------
-- A5. message_sentiments
-- -------------------------------------------------------
DROP POLICY IF EXISTS "message_sentiments_select" ON message_sentiments;
CREATE POLICY "message_sentiments_select" ON message_sentiments
  FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS "message_sentiments_insert" ON message_sentiments;
CREATE POLICY "message_sentiments_insert" ON message_sentiments
  FOR INSERT WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS "message_sentiments_update" ON message_sentiments;
CREATE POLICY "message_sentiments_update" ON message_sentiments
  FOR UPDATE USING (is_account_member(account_id));

DROP POLICY IF EXISTS "message_sentiments_delete" ON message_sentiments;
CREATE POLICY "message_sentiments_delete" ON message_sentiments
  FOR DELETE USING (is_account_member(account_id));


-- ============================================================
-- PART B: Super-Admin SELECT Policies for Monitoring Tables
-- ============================================================
-- Migration 045 created these tables with service_role-only policies.
-- Super admins need SELECT access to view monitoring data in the admin UI.
-- For system_alerts, super admins also need UPDATE (to acknowledge alerts).
-- INSERT remains service_role-only (system writes only).
-- ============================================================

-- -------------------------------------------------------
-- B1. system_logs — super admin SELECT
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can view system_logs" ON system_logs;
CREATE POLICY "Super admins can view system_logs" ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- -------------------------------------------------------
-- B2. system_alerts — super admin SELECT + UPDATE
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can view system_alerts" ON system_alerts;
CREATE POLICY "Super admins can view system_alerts" ON system_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update system_alerts" ON system_alerts;
CREATE POLICY "Super admins can update system_alerts" ON system_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- -------------------------------------------------------
-- B3. health_snapshots — super admin SELECT
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can view health_snapshots" ON health_snapshots;
CREATE POLICY "Super admins can view health_snapshots" ON health_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- -------------------------------------------------------
-- B4. security_events — super admin SELECT
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can view security_events" ON security_events;
CREATE POLICY "Super admins can view security_events" ON security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- -------------------------------------------------------
-- B5. api_metrics_hourly — super admin SELECT
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can view api_metrics_hourly" ON api_metrics_hourly;
CREATE POLICY "Super admins can view api_metrics_hourly" ON api_metrics_hourly
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );
