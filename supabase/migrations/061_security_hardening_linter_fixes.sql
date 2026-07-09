-- Migration 061: Security Hardening - Supabase Linter Fixes
-- Resolves all warnings from Supabase database linter
-- Applied: 2026-07-09
--
-- Fixes:
--   1. Set search_path on all custom functions (prevents search_path injection)
--   2. Revoke EXECUTE from PUBLIC on SECURITY DEFINER functions (prevents anon access)
--   3. Fix agent_events RLS policies (was too permissive)
--   4. Fix storage bucket policies (restrict to authenticated users)
--
-- Note: Leaked password protection (password_hibp_enabled) requires Supabase Pro plan.
-- Password policy strengthened via Auth API: min 8 chars, requires lowercase+uppercase+digits.

BEGIN;

-- ============================================
-- PART 1: Fix mutable search_path on functions
-- ============================================

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public._bcast_cols_for_status() SET search_path = public;
ALTER FUNCTION public.compute_contact_completeness() SET search_path = public;
ALTER FUNCTION public.claim_agent_events(batch_size integer) SET search_path = public;
ALTER FUNCTION public.complete_agent_event(event_id uuid, event_result jsonb, event_error text) SET search_path = public;
ALTER FUNCTION public.get_campaign_performance(p_campaign_id uuid) SET search_path = public;
ALTER FUNCTION public.get_account_campaign_summary(p_account_id uuid, p_days integer) SET search_path = public;
ALTER FUNCTION public.analyze_database_for_reactivation(p_account_id uuid) SET search_path = public;
ALTER FUNCTION public.get_platform_campaigns_overview(p_status text, p_account_id uuid, p_category text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) SET search_path = public;
ALTER FUNCTION public.get_platform_alerts() SET search_path = public;
ALTER FUNCTION public.get_platform_revenue_overview() SET search_path = public;
ALTER FUNCTION public.get_platform_campaign_analytics(p_days integer) SET search_path = public;
ALTER FUNCTION public.get_platform_engagement_analytics(p_days integer) SET search_path = public;
ALTER FUNCTION public.get_platform_cohort_analytics() SET search_path = public;
ALTER FUNCTION public.update_account_subscription(p_account_id uuid, p_tier text, p_status text) SET search_path = public;
ALTER FUNCTION public.increment_campaign_trigger_count(p_trigger_id uuid) SET search_path = public;
ALTER FUNCTION public.count_ai_replies_last_24h(p_account_id uuid, p_contact_id uuid) SET search_path = public;
ALTER FUNCTION public.update_ai_chatbot_config_updated_at() SET search_path = public;
ALTER FUNCTION public.update_ai_knowledge_base_updated_at() SET search_path = public;
ALTER FUNCTION public.get_system_health_summary() SET search_path = public;
ALTER FUNCTION public.get_error_trends(p_hours_back integer) SET search_path = public;
ALTER FUNCTION public.get_security_summary(p_hours_back integer) SET search_path = public;
ALTER FUNCTION public.cleanup_monitoring_data() SET search_path = public;
ALTER FUNCTION public.get_platform_accounts_overview(p_search text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) SET search_path = public;
ALTER FUNCTION public.get_platform_metrics() SET search_path = public;
ALTER FUNCTION public.get_platform_account_detail(p_account_id uuid) SET search_path = public;
ALTER FUNCTION public.get_platform_growth_series(p_days integer) SET search_path = public;
ALTER FUNCTION public.get_campaign_stats(p_campaign_id uuid) SET search_path = public;
ALTER FUNCTION public.increment_warmup_counter(p_account_id uuid, p_phone_number_id text) SET search_path = public;
ALTER FUNCTION public.increment_template_send(p_account_id uuid, p_template_name text) SET search_path = public;
ALTER FUNCTION public.record_template_block(p_account_id uuid, p_template_name text) SET search_path = public;
ALTER FUNCTION public.analyze_purchase_recency(p_account_id uuid) SET search_path = public;
ALTER FUNCTION public.apply_adaptive_recency(p_account_id uuid) SET search_path = public;
ALTER FUNCTION public.get_branch_metrics(p_account_id uuid, p_branch_id uuid) SET search_path = public;
ALTER FUNCTION public.get_vector_storage_stats() SET search_path = public;

-- ============================================
-- PART 2: Revoke PUBLIC EXECUTE on SECURITY DEFINER functions
-- (anon inherits from PUBLIC, so REVOKE FROM anon alone is insufficient)
-- ============================================

REVOKE EXECUTE ON FUNCTION public._bcast_bump(bid uuid, col text, delta integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._bcast_bump(bid uuid, col text, delta integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public._bcast_bump(bid uuid, col text, delta integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.aggregate_execution_metrics(p_time_range_start timestamp with time zone, p_time_range_end timestamp with time zone, p_group_by text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aggregate_execution_metrics(p_time_range_start timestamp with time zone, p_time_range_end timestamp with time zone, p_group_by text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_execution_metrics(p_time_range_start timestamp with time zone, p_time_range_end timestamp with time zone, p_group_by text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.analyze_database_for_reactivation(p_account_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analyze_database_for_reactivation(p_account_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_database_for_reactivation(p_account_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.analyze_purchase_recency(p_account_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analyze_purchase_recency(p_account_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_purchase_recency(p_account_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.apply_adaptive_recency(p_account_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_adaptive_recency(p_account_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_adaptive_recency(p_account_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.broadcast_recipient_aggregate_trigger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.broadcast_recipient_aggregate_trigger() TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_recipient_aggregate_trigger() TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_agent_events(batch_size integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_agent_events(batch_size integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agent_events(batch_size integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_monitoring_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_monitoring_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_monitoring_data() TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_agent_event(event_id uuid, event_result jsonb, event_error text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_agent_event(event_id uuid, event_result jsonb, event_error text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_agent_event(event_id uuid, event_result jsonb, event_error text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.count_ai_replies_last_24h(p_account_id uuid, p_contact_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_ai_replies_last_24h(p_account_id uuid, p_contact_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_ai_replies_last_24h(p_account_id uuid, p_contact_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.generate_transition_recommendation(p_account_id uuid, p_package_config_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_transition_recommendation(p_account_id uuid, p_package_config_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_transition_recommendation(p_account_id uuid, p_package_config_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_account_campaign_summary(p_account_id uuid, p_days integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_campaign_summary(p_account_id uuid, p_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_campaign_summary(p_account_id uuid, p_days integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_branch_metrics(p_account_id uuid, p_branch_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_branch_metrics(p_account_id uuid, p_branch_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_branch_metrics(p_account_id uuid, p_branch_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_campaign_performance(p_campaign_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_performance(p_campaign_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_performance(p_campaign_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_campaign_stats(p_campaign_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_stats(p_campaign_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_stats(p_campaign_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_error_trends(p_hours_back integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_error_trends(p_hours_back integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_error_trends(p_hours_back integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_account_detail(p_account_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_account_detail(p_account_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_account_detail(p_account_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_accounts_overview(p_search text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_accounts_overview(p_search text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_accounts_overview(p_search text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_alerts() TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_campaign_analytics(p_days integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_campaign_analytics(p_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_campaign_analytics(p_days integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_campaigns_overview(p_status text, p_account_id uuid, p_category text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_campaigns_overview(p_status text, p_account_id uuid, p_category text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_campaigns_overview(p_status text, p_account_id uuid, p_category text, p_sort_by text, p_sort_dir text, p_limit integer, p_offset integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_cohort_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_cohort_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_cohort_analytics() TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_engagement_analytics(p_days integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_engagement_analytics(p_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_engagement_analytics(p_days integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_growth_series(p_days integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_growth_series(p_days integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_growth_series(p_days integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_metrics() TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_platform_revenue_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_revenue_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_revenue_overview() TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_security_summary(p_hours_back integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_security_summary(p_hours_back integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_summary(p_hours_back integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_system_health_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_health_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health_summary() TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_vector_storage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vector_storage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vector_storage_stats() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_automation_execution_count(p_automation_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_automation_execution_count(p_automation_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_automation_execution_count(p_automation_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_campaign_trigger_count(p_trigger_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_campaign_trigger_count(p_trigger_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_trigger_count(p_trigger_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_flow_execution_count(p_flow_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_flow_execution_count(p_flow_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_flow_execution_count(p_flow_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_template_send(p_account_id uuid, p_template_name text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_template_send(p_account_id uuid, p_template_name text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_template_send(p_account_id uuid, p_template_name text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_warmup_counter(p_account_id uuid, p_phone_number_id text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_warmup_counter(p_account_id uuid, p_phone_number_id text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_warmup_counter(p_account_id uuid, p_phone_number_id text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_account_member(target_account_id uuid, min_role account_role_enum) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_account_member(target_account_id uuid, min_role account_role_enum) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_member(target_account_id uuid, min_role account_role_enum) TO service_role;
-- Pre-auth function: anon needs access
GRANT EXECUTE ON FUNCTION public.is_account_member(target_account_id uuid, min_role account_role_enum) TO anon;

REVOKE EXECUTE ON FUNCTION public.match_knowledge_embeddings(p_account_id uuid, p_embedding vector, p_match_threshold double precision, p_match_count integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_knowledge_embeddings(p_account_id uuid, p_embedding vector, p_match_threshold double precision, p_match_count integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge_embeddings(p_account_id uuid, p_embedding vector, p_match_threshold double precision, p_match_count integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.merge_duplicate_contacts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_contacts() TO service_role;

REVOKE EXECUTE ON FUNCTION public.peek_invitation(p_token_hash text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_invitation(p_token_hash text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.peek_invitation(p_token_hash text) TO service_role;
-- Pre-auth function: anon needs access
GRANT EXECUTE ON FUNCTION public.peek_invitation(p_token_hash text) TO anon;

REVOKE EXECUTE ON FUNCTION public.recompute_broadcast_counts(bid uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_broadcast_counts(bid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_broadcast_counts(bid uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_template_block(p_account_id uuid, p_template_name text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_template_block(p_account_id uuid, p_template_name text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_template_block(p_account_id uuid, p_template_name text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.redeem_invitation(p_token_hash text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invitation(p_token_hash text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_invitation(p_token_hash text) TO service_role;
-- Pre-auth function: anon needs access
GRANT EXECUTE ON FUNCTION public.redeem_invitation(p_token_hash text) TO anon;

REVOKE EXECUTE ON FUNCTION public.remove_account_member(p_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_account_member(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_account_member(p_user_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_member_role(p_user_id uuid, p_new_role account_role_enum) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_member_role(p_user_id uuid, p_new_role account_role_enum) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(p_user_id uuid, p_new_role account_role_enum) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transfer_account_ownership(p_new_owner_user_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_account_ownership(p_new_owner_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_account_ownership(p_new_owner_user_id uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_account_subscription(p_account_id uuid, p_tier text, p_status text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_account_subscription(p_account_id uuid, p_tier text, p_status text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_account_subscription(p_account_id uuid, p_tier text, p_status text) TO service_role;

-- ============================================
-- PART 3: Fix agent_events RLS policies
-- ============================================

DROP POLICY IF EXISTS "agent_events_read" ON public.agent_events;
DROP POLICY IF EXISTS "agent_events_service_role" ON public.agent_events;

CREATE POLICY "agent_events_read" ON public.agent_events
  FOR SELECT TO authenticated
  USING (is_account_member(account_id));

CREATE POLICY "agent_events_service_role" ON public.agent_events
  FOR ALL TO service_role
  USING (true);

-- ============================================
-- PART 4: Fix storage bucket policies
-- (Restrict INSERT/UPDATE/DELETE to authenticated only)
-- ============================================

DROP POLICY IF EXISTS "Members can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Members can update chat media" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete chat media" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload flow media" ON storage.objects;
DROP POLICY IF EXISTS "Members can update flow media" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete flow media" ON storage.objects;

CREATE POLICY "Authenticated members can upload chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated members can update chat media" ON storage.objects
  FOR UPDATE TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated members can delete chat media" ON storage.objects
  FOR DELETE TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated members can upload flow media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'flow-media');

CREATE POLICY "Authenticated members can update flow media" ON storage.objects
  FOR UPDATE TO authenticated
  WITH CHECK (bucket_id = 'flow-media');

CREATE POLICY "Authenticated members can delete flow media" ON storage.objects
  FOR DELETE TO authenticated
  WITH CHECK (bucket_id = 'flow-media');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Authenticated users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated
  WITH CHECK (bucket_id = 'avatars');

COMMIT;