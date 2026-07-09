export interface FunnelConfig {
  id: string
  account_id: string
  name: string
  industry_preset: string
  channels: string[]
  social_platforms: SocialPlatformConfig[]
  ad_budget_daily_ngn: number
  nurture_length_days: number
  nurture_max_touchpoints: number
  escalate_after_unanswered: number
  close_mechanism: string
  cart_recovery_delay_minutes: number
  max_discount_percent: number
  cod_confirmation_enabled: boolean
  review_request_delay_days: number
  dormancy_threshold_days: number
  referral_enabled: boolean
  lookalike_auto_sync: boolean
  lookalike_seed_minimum: number
  lookalike_sync_frequency: string
  report_frequency: string
  report_delivery_channels: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SocialPlatformConfig {
  platform: string
  posts_per_week: number
  content_types: string[]
  funnel_entry_point: string
}

export interface IndustryPreset {
  id: string
  name: string
  icon: string
  description: string
  channels: string[]
  social_platforms: SocialPlatformConfig[]
  nurture_length_days: number
  nurture_max_touchpoints: number
  close_mechanism: string
  dormancy_threshold_days: number
  report_frequency: string
  avg_deal_value_range: string
}

export interface FunnelStageMetric {
  id: string
  stage: 'attract' | 'capture' | 'nurture' | 'close' | 'expand'
  period_start: string
  period_end: string
  contacts_entered: number
  contacts_converted: number
  contacts_dropped: number
  revenue_attributed_ngn: number
  cost_ngn: number
}

export interface FunnelReport {
  id: string
  report_type: string
  period_start: string
  period_end: string
  report_data: Record<string, unknown>
  recommendations: string[]
  delivered_via: string[]
  delivered_at: string | null
  created_at: string
}

export interface LookalikeSyncEntry {
  id: string
  segment_name: string
  contact_count: number
  sync_status: 'pending' | 'uploading' | 'processing' | 'ready' | 'error'
  synced_at: string | null
}

export interface PresetChangeEntry {
  id: string
  parameter_name: string
  old_value: string | null
  new_value: string
  reason: string | null
  outcome_classification: 'positive' | 'mixed' | 'negative' | 'inconclusive' | null
  created_at: string
}

export interface CustomIndustryWizardAnswers {
  business_type: 'physical_products' | 'digital_products' | 'services' | 'venue' | 'marketplace'
  industry_name: string
  sales_cycle: 'same_day' | '1_7_days' | '1_4_weeks' | '1_3_months' | '3_plus_months'
  avg_transaction: 'under_10k' | '10k_100k' | '100k_1m' | '1m_10m' | 'over_10m'
  customer_channels: string[]
  close_mechanism: 'online_payment' | 'cod' | 'bank_transfer' | 'booking' | 'walk_in' | 'hybrid'
  repeat_frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'one_time'
}

export const HELP_TEXTS: Record<
  string,
  { title: string; what: string; example: string; recommended: string; mistake?: string; related?: string }
> = {
  industry_preset: {
    title: 'Industry Preset',
    what: 'Pick your industry to auto-fill the best settings. Choose "Custom" if your industry is not listed — a quick wizard will guide you.',
    example: 'A restaurant picks "Restaurant" and gets 3-day nurture, Instagram + Facebook channels, and walk-in close mechanism.',
    recommended: 'Always start with a preset, then adjust individual settings based on your experience.',
  },
  channels: {
    title: 'Marketing Channels',
    what: 'Where your ads and content will appear to attract new customers.',
    example: 'A retail store might use Instagram Ads + Facebook Ads + Google Shopping.',
    recommended: 'Start with 2-3 channels. Add more only when existing ones are profitable.',
    mistake: 'Do not spread budget across too many channels. Better to dominate 2 than be invisible on 5.',
  },
  nurture_length_days: {
    title: 'Nurture Sequence Length',
    what: 'How many days the automated follow-up messages run after someone shows interest.',
    example: 'A restaurant uses 3 days (people decide quickly). A real estate agent uses 30 days (buyers research extensively).',
    recommended: '3-5 days for low-cost products. 14-30 days for expensive services.',
    mistake: 'Too short = lost leads who needed more time. Too long = annoying people who already decided.',
    related: 'nurture_max_touchpoints',
  },
  nurture_max_touchpoints: {
    title: 'Maximum Follow-up Messages',
    what: 'The most automated messages someone receives during nurture. After this, the system stops or escalates to a human.',
    example: 'A B2C business sends 3-4 messages. A B2B consultancy sends 6-8 with case studies and insights.',
    recommended: '3-4 for B2C, 6-8 for B2B.',
    mistake: 'More than 8 touchpoints rarely helps — it usually annoys.',
    related: 'nurture_length_days',
  },
  escalate_after_unanswered: {
    title: 'Escalate to Human After',
    what: 'After this many unanswered messages, the system alerts a human team member to follow up personally.',
    example: 'Set to 2 for high-value leads (₦500K+ deals). Set to 3 for general enquiries.',
    recommended: '2 for high-value, 3 for general.',
  },
  cart_recovery_delay_minutes: {
    title: 'Cart Recovery Delay',
    what: 'How long to wait after someone abandons their cart before sending the first reminder.',
    example: '60 minutes is standard. The customer might still be comparing prices.',
    recommended: '60 minutes. Too fast feels pushy, too slow loses the moment.',
    mistake: 'Sending immediately (under 15 minutes) feels like surveillance.',
  },
  max_discount_percent: {
    title: 'Maximum Auto-Discount',
    what: 'The biggest discount the system can offer automatically in recovery or close sequences.',
    example: 'Set to 0% if your brand never discounts. 10% is typical for retail.',
    recommended: '10-15%. Never exceed 20% — it trains customers to wait for discounts.',
    mistake: 'Setting this too high devalues your product and attracts discount-hunters.',
  },
  review_request_delay_days: {
    title: 'Review Request Timing',
    what: 'Days after purchase before asking the customer for a review.',
    example: '3 days for products (they have tried it). 7 days for services (they have seen results).',
    recommended: '3 days for products, 7 for services.',
    mistake: 'Asking too early = customer has no opinion yet. Asking too late = they have forgotten the experience.',
  },
  dormancy_threshold_days: {
    title: 'Dormancy Threshold',
    what: 'Days without a purchase before a customer is considered "dormant" and enters the win-back sequence.',
    example: '30 days for restaurants (people eat weekly). 180 days for B2B (quarterly purchases).',
    recommended: '30 for restaurants, 60 for retail, 90-180 for B2B.',
    related: 'report_frequency',
  },
  report_frequency: {
    title: 'Report Frequency',
    what: 'How often the client receives a funnel performance report.',
    example: 'Weekly for restaurants (fast-moving). Monthly for real estate (slow sales cycle).',
    recommended: 'Weekly for fast industries, bi-weekly for medium, monthly for slow.',
  },
  lookalike_auto_sync: {
    title: 'Lookalike Audience Auto-Sync',
    what: 'Automatically upload your best customer segments to Meta to find similar people for ads.',
    example: 'Your top 100 repeat buyers are synced to Meta, which finds 10,000 similar people to target.',
    recommended: 'Enable once you have 100+ contacts in your best customer segment.',
    related: 'lookalike_seed_minimum',
  },
  lookalike_seed_minimum: {
    title: 'Minimum Seed Size',
    what: 'The smallest number of contacts needed before syncing to Meta. More contacts = better matching.',
    example: 'Meta recommends 100+ for quality. 500+ gives excellent results.',
    recommended: '100 minimum. Increase to 250 for better quality if you have enough contacts.',
  },
  ad_budget_daily_ngn: {
    title: 'Daily Ad Budget',
    what: 'How much to spend on paid ads per day across all channels.',
    example: '₦5,000/day is a good starting point. Scale up when you see positive returns.',
    recommended: 'Start at ₦5,000/day. Increase by 20% weekly if ROAS > 2x.',
    mistake: 'Starting too high wastes money before you know what works. Start small, test, then scale.',
  },
}
