-- Migration 067: Security cleanup - revoke anon access from remaining custom functions
-- Applied: 2026-07-16
-- Purpose: Close remaining anon access gaps found in post-066 verification

BEGIN;

-- ============================================================
-- 1. Revoke anon/public EXECUTE from admin/authenticated functions
-- ============================================================

-- _bcast_cols_for_status: internal broadcast helper
REVOKE EXECUTE ON FUNCTION public._bcast_cols_for_status(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public._bcast_cols_for_status(text) TO authenticated, service_role;

-- aggregate_preset_learnings: admin analytics function
REVOKE EXECUTE ON FUNCTION public.aggregate_preset_learnings(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.aggregate_preset_learnings(text) TO authenticated, service_role;

-- get_accounts_needing_reports: admin reporting function
REVOKE EXECUTE ON FUNCTION public.get_accounts_needing_reports() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accounts_needing_reports() TO authenticated, service_role;

-- get_connection_count: admin monitoring function
REVOKE EXECUTE ON FUNCTION public.get_connection_count() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_connection_count() TO authenticated, service_role;

-- get_database_size: admin monitoring function
REVOKE EXECUTE ON FUNCTION public.get_database_size() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_database_size() TO authenticated, service_role;

-- get_funnel_overview: authenticated analytics function
REVOKE EXECUTE ON FUNCTION public.get_funnel_overview(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_funnel_overview(uuid) TO authenticated, service_role;

-- get_storage_size: admin monitoring function
REVOKE EXECUTE ON FUNCTION public.get_storage_size() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_size() TO authenticated, service_role;

-- ============================================================
-- 2. Revoke anon/public EXECUTE from trigger functions
--    Triggers still work because they execute as the function owner,
--    not as the calling role. Revoking direct EXECUTE prevents
--    anon from calling these functions directly via RPC.
-- ============================================================

-- compute_contact_completeness: trigger function
REVOKE EXECUTE ON FUNCTION public.compute_contact_completeness() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_contact_completeness() TO authenticated, service_role;

-- update_ai_chatbot_config_updated_at: trigger function
REVOKE EXECUTE ON FUNCTION public.update_ai_chatbot_config_updated_at() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_ai_chatbot_config_updated_at() TO authenticated, service_role;

-- update_ai_knowledge_base_updated_at: trigger function
REVOKE EXECUTE ON FUNCTION public.update_ai_knowledge_base_updated_at() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_ai_knowledge_base_updated_at() TO authenticated, service_role;

-- update_updated_at_column: trigger function
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;

COMMIT;
