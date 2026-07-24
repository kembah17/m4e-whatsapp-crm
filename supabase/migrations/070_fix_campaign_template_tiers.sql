-- Migration 070: Fix campaign template tiers AND package_configs slug mismatches
-- =============================================================================
-- ROOT CAUSE: Migration 041 assigned tiers by complexity (1=basic, 2=pro, 3=enterprise)
-- but migration 060 assigned campaigns to packages by business function.
-- Additionally, migration 060 used WRONG slug values that don't match actual templates.
-- This migration fixes BOTH issues.
-- =============================================================================

-- ============================================================
-- PART 1: Fix campaign_templates tier values
-- Align tiers with package assignments (1=Reactivation, 2=Online Presence, 3=Growth Engine)
-- ============================================================

-- Package 1 (Customer Reactivation) campaigns -> tier 1
UPDATE campaign_templates SET tier = 1 WHERE slug IN (
  'win_back',
  'review_collection',
  'birthday_campaign',
  'referral_program',
  'vip_rewards',
  'post_purchase_thank_you'
);

-- Package 2 (Online Presence) campaigns -> tier 2
UPDATE campaign_templates SET tier = 2 WHERE slug IN (
  'ad-lead-nurture',
  'whatsapp-flow-survey'
);

-- Package 3 (Growth Engine) campaigns -> tier 3
UPDATE campaign_templates SET tier = 3 WHERE slug IN (
  'abandoned_cart',
  'order_status',
  'cod_confirmation',
  'upsell_cross_sell',
  'catalog-browse',
  'sentiment-recovery'
);

-- ============================================================
-- PART 2: Fix package_configs campaign_slugs
-- Replace wrong slugs with actual slugs from campaign_templates
-- ============================================================

-- Fix pkg1_reactivation:
-- WRONG: win_back_campaign -> CORRECT: win_back
-- WRONG: vip_loyalty -> CORRECT: vip_rewards
-- WRONG: post_purchase_followup -> CORRECT: post_purchase_thank_you
UPDATE package_configs
SET campaign_slugs = ARRAY[
  'win_back',
  'review_collection',
  'birthday_campaign',
  'referral_program',
  'vip_rewards',
  'post_purchase_thank_you'
]
WHERE package_key = 'pkg1_reactivation';

-- Fix pkg2_online_presence:
-- WRONG: lead_nurture -> DOES NOT EXIST (removed)
-- WRONG: ad_lead_nurture -> CORRECT: ad-lead-nurture (hyphens)
-- WRONG: whatsapp_flow_survey -> CORRECT: whatsapp-flow-survey (hyphens)
UPDATE package_configs
SET campaign_slugs = ARRAY[
  'ad-lead-nurture',
  'whatsapp-flow-survey'
]
WHERE package_key = 'pkg2_online_presence';

-- Fix pkg3_growth_engine:
-- WRONG: cross_sell_upsell -> CORRECT: upsell_cross_sell
-- WRONG: catalog_browse -> CORRECT: catalog-browse (hyphens)
-- ADDED: sentiment-recovery (was missing)
UPDATE package_configs
SET campaign_slugs = ARRAY[
  'abandoned_cart',
  'order_status',
  'cod_confirmation',
  'upsell_cross_sell',
  'catalog-browse',
  'sentiment-recovery'
]
WHERE package_key = 'pkg3_growth_engine';

-- Fix complete programme (all campaigns):
UPDATE package_configs
SET campaign_slugs = ARRAY[
  'win_back',
  'review_collection',
  'birthday_campaign',
  'referral_program',
  'vip_rewards',
  'post_purchase_thank_you',
  'ad-lead-nurture',
  'whatsapp-flow-survey',
  'abandoned_cart',
  'order_status',
  'cod_confirmation',
  'upsell_cross_sell',
  'catalog-browse',
  'sentiment-recovery'
]
WHERE package_key = 'complete';

-- Fix unicorn programme (all campaigns):
UPDATE package_configs
SET campaign_slugs = ARRAY[
  'win_back',
  'review_collection',
  'birthday_campaign',
  'referral_program',
  'vip_rewards',
  'post_purchase_thank_you',
  'ad-lead-nurture',
  'whatsapp-flow-survey',
  'abandoned_cart',
  'order_status',
  'cod_confirmation',
  'upsell_cross_sell',
  'catalog-browse',
  'sentiment-recovery'
]
WHERE package_key = 'unicorn';

-- ============================================================
-- VERIFICATION QUERIES (uncomment to run manually)
-- ============================================================
-- SELECT slug, name, tier FROM campaign_templates ORDER BY tier, slug;
-- SELECT package_key, campaign_slugs FROM package_configs ORDER BY package_key;
-- 
-- Check for orphan slugs (slugs in package_configs not in campaign_templates):
-- SELECT DISTINCT unnest(campaign_slugs) AS slug
-- FROM package_configs
-- WHERE unnest(campaign_slugs) NOT IN (SELECT slug FROM campaign_templates);
