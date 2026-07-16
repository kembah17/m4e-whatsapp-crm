-- Migration 066: Security Hardening Round 2 - Supabase Linter Fixes
-- Resolves all remaining warnings from Supabase database linter (July 2026)
--
-- Context: Migration 061 fixed functions created in migrations 001-061.
-- Functions created in migrations 062-065 were not covered.
-- This migration closes all remaining gaps.
--
-- Fixes:
--   1. [ERROR] Enable RLS on firecrawl_audit_log + add policies
--   2. [WARN]  Fix search_path on 3 functions from migration 064
--   3. [WARN]  Revoke anon EXECUTE on SECURITY DEFINER functions from 062-064
--   4. [WARN]  Restrict internal/trigger/admin functions from authenticated
--   5. [INFO]  Add policies to automation_pending_executions
--   6. [WARN]  vector extension in public - DEFERRED (see note)
--   7. [WARN]  Leaked password protection - requires Supabase Pro plan
--
-- Intentionally NOT changed (false positives):
--   - is_account_member: MUST be anon-accessible (used in RLS USING clauses)
--   - peek_invitation: MUST be anon-accessible (pre-auth invitation flow)
--   - redeem_invitation: MUST be anon-accessible (pre-auth invitation flow)
--
-- Deferred:
--   - Moving vector extension from public to extensions schema is risky
--     because knowledge_embeddings.embedding column depends on public.vector(1536).
--     Moving the extension would require dropping/recreating the column and all
--     dependent functions. This is a low-risk warning (the extension works fine
--     in public) and should be addressed during a planned maintenance window.

BEGIN;

-- ============================================
-- PART 1: Enable RLS on firecrawl_audit_log
-- (ERROR: RLS Disabled in Public)
-- ============================================

ALTER TABLE public.firecrawl_audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all audit logs
CREATE POLICY "firecrawl_audit_super_admin_all"
  ON public.firecrawl_audit_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Account members can view their own account's audit logs
CREATE POLICY "firecrawl_audit_account_member_select"
  ON public.firecrawl_audit_log
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Service role inserts via API routes (no user-facing INSERT needed)
-- service_role bypasses RLS, so no INSERT policy required.


-- ============================================
-- PART 2: Fix mutable search_path on functions
-- created in migrations 062-064 (missed by 061)
-- ============================================

-- From migration 064 (message_archival)
ALTER FUNCTION public.get_database_size() SET search_path = public;
ALTER FUNCTION public.get_storage_size() SET search_path = public;
ALTER FUNCTION public.get_connection_count() SET search_path = public;

-- From migration 063 (reporting_learning)
ALTER FUNCTION public.aggregate_preset_learnings(p_industry text) SET search_path = public;
ALTER FUNCTION public.get_accounts_needing_reports() SET search_path = public;

-- From migration 062 (funnel_engine)
ALTER FUNCTION public.get_funnel_overview(p_account_id uuid) SET search_path = public;


-- ============================================
-- PART 3: Revoke anon EXECUTE on SECURITY DEFINER
-- functions from migrations 062-064
-- (WARN: Public Can Execute SECURITY DEFINER Function)
-- ============================================

-- aggregate_preset_learnings - authenticated users only
REVOKE EXECUTE ON FUNCTION public.aggregate_preset_learnings(p_industry text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aggregate_preset_learnings(p_industry text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_preset_learnings(p_industry text) TO service_role;

-- get_accounts_needing_reports - cron/service_role only
REVOKE EXECUTE ON FUNCTION public.get_accounts_needing_reports() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accounts_needing_reports() TO service_role;
-- Note: NOT granting to authenticated - only called from cron route via service_role

-- get_funnel_overview - authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_funnel_overview(p_account_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_funnel_overview(p_account_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_overview(p_account_id uuid) TO service_role;

-- get_database_size - service_role only (called from infrastructure-alerts via supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.get_database_size() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_database_size() TO service_role;

-- get_storage_size - service_role only (called from infrastructure-alerts via supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.get_storage_size() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_size() TO service_role;

-- get_connection_count - service_role only (called from infrastructure-alerts via supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.get_connection_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_connection_count() TO service_role;


-- ============================================
-- PART 4: Restrict internal/trigger/admin functions
-- from direct authenticated REST API calls
-- (WARN: Signed-In Users Can Execute SECURITY DEFINER Function)
-- ============================================

-- These functions should ONLY be callable by triggers or service_role,
-- never directly by authenticated users via the REST API.

-- _bcast_bump: internal broadcast counter helper (not called from TypeScript)
REVOKE EXECUTE ON FUNCTION public._bcast_bump(bid uuid, col text, delta integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._bcast_bump(bid uuid, col text, delta integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._bcast_bump(bid uuid, col text, delta integer) TO service_role;

-- broadcast_recipient_aggregate_trigger: trigger function (not called from TypeScript)
REVOKE EXECUTE ON FUNCTION public.broadcast_recipient_aggregate_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.broadcast_recipient_aggregate_trigger() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_recipient_aggregate_trigger() TO service_role;

-- handle_new_user: auth trigger function (only referenced in a comment)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- cleanup_monitoring_data: cron-only (called from cron route via supabaseAdmin)
REVOKE EXECUTE ON FUNCTION public.cleanup_monitoring_data() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_monitoring_data() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_monitoring_data() TO service_role;

-- get_accounts_needing_reports: already restricted in Part 3, ensure authenticated is revoked
REVOKE EXECUTE ON FUNCTION public.get_accounts_needing_reports() FROM authenticated;


-- ============================================
-- PART 5: Add policies to automation_pending_executions
-- (INFO: RLS Enabled No Policy)
-- This table is intentionally service-role only.
-- Adding policies to satisfy the linter.
-- ============================================

-- Block all regular user access (service_role bypasses RLS)
CREATE POLICY "automation_pending_deny_all"
  ON public.automation_pending_executions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Super admins can view for debugging purposes
CREATE POLICY "automation_pending_super_admin_select"
  ON public.automation_pending_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );


-- ============================================
-- PART 6: Notes on remaining warnings
-- ============================================

-- 6a. vector extension in public schema:
--   Moving pgvector from public to extensions schema requires:
--   1. Dropping match_knowledge_embeddings function
--   2. Dropping knowledge_embeddings.embedding column
--   3. ALTER EXTENSION vector SET SCHEMA extensions
--   4. Recreating column with extensions.vector(1536) type
--   5. Recreating function with extensions.vector parameter
--   6. Rebuilding all vector indexes
--   Risk: Data loss if not done carefully. Deferred to maintenance window.
--   Impact: LOW - extension works correctly in public schema.

-- 6b. Leaked password protection:
--   Requires Supabase Pro plan ($25/month).
--   Password policy already strengthened: min 8 chars, mixed case + digits.
--   Will enable when upgrading to Pro.

-- 6c. Functions intentionally left anon-accessible:
--   - is_account_member(uuid, account_role_enum): Used in RLS USING clauses.
--     PostgreSQL evaluates RLS policies with the caller's role. If anon
--     cannot execute this function, RLS policies that reference it will fail
--     for unauthenticated PostgREST requests (returning 0 rows instead of
--     proper auth errors). This is the correct Supabase pattern.
--   - peek_invitation(text): Pre-auth flow - user clicks invite link before
--     signing in. Must be callable without authentication.
--   - redeem_invitation(text): Pre-auth flow - user redeems invite during
--     signup. Must be callable without authentication.


COMMIT;
