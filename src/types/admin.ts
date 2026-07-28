// ============================================================
// Super Admin Platform Types
// ============================================================

export interface PlatformMetrics {
  total_accounts: number
  total_users: number
  total_contacts: number
  total_conversations: number
  total_messages: number
  total_deals: number
  total_deal_value: number
  total_broadcasts: number
  total_automations: number
  active_automations: number
  whatsapp_connected_accounts: number
  accounts_last_7d: number
  accounts_last_30d: number
  contacts_last_7d: number
  contacts_last_30d: number
  messages_last_7d: number
  messages_last_30d: number
  broadcasts_sent_last_30d: number
}

export interface PlatformAccountRow {
  account_id: string
  account_name: string
  owner_user_id: string
  owner_name: string | null
  owner_email: string | null
  created_at: string
  member_count: number
  contact_count: number
  conversation_count: number
  deal_count: number
  broadcast_count: number
  automation_count: number
  whatsapp_connected: boolean
  last_activity_at: string | null
}

export interface PlatformAccountDetail {
  account: {
    id: string
    name: string
    owner_user_id: string
    created_at: string
    updated_at: string
    default_currency: string
  }
  members: Array<{
    user_id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    account_role: string
    created_at: string
  }>
  stats: {
    contacts: number
    conversations: number
    open_conversations: number
    messages_total: number
    messages_last_7d: number
    deals_open: number
    deals_value: number
    broadcasts_sent: number
    automations_active: number
    products: number
    branches: number
  }
  whatsapp: Array<{
    phone_number_id: string | null
    status: string
    connected_at: string | null
    registered_at: string | null
  }>
  onboarding: {
    has_whatsapp: boolean
    has_contacts: boolean
    has_sent_broadcast: boolean
    has_automation: boolean
    has_pipeline: boolean
    has_products: boolean
  }
  recent_activity: Array<{
    type: string
    content: string | null
    sender_type: string
    created_at: string
  }>
}

export interface PlatformGrowthPoint {
  day: string
  new_accounts: number
  new_contacts: number
  new_conversations: number
  messages_sent: number
}

// ============================================================
// Campaign Monitoring Types
// ============================================================

export interface PlatformCampaignRow {
  campaign_id: string
  campaign_name: string
  account_name: string
  account_id: string
  template_name: string | null
  template_category: string | null
  status: string
  channel: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  total_audience: number
  total_sent: number
  total_delivered: number
  total_read: number
  total_replied: number
  total_failed: number
  open_rate: number
  reply_rate: number
}

export interface PlatformCampaignsOverview {
  campaigns: PlatformCampaignRow[]
  total_count: number
}

// ============================================================
// System Alerts Types
// ============================================================

export interface AlertAccount {
  account_id: string
  account_name: string
  owner_email: string | null
}

export interface PlatformAlerts {
  disconnected_whatsapp: Array<AlertAccount & { created_at: string }>
  inactive_accounts: Array<AlertAccount & { last_activity: string | null }>
  failed_broadcasts: Array<{
    account_id: string
    account_name: string
    broadcast_id: string
    broadcast_name: string
    status: string
    created_at: string
  }>
  approaching_limits: Array<{
    account_id: string
    account_name: string
    contact_count: number
    tier: string
  }>
}

// ============================================================
// Revenue & Billing Types
// ============================================================

export type SubscriptionTier = "starter" | "professional" | "business" | "enterprise"
export type SubscriptionStatus = "active" | "trial" | "suspended" | "cancelled"

export interface RevenueAccount {
  account_id: string
  account_name: string
  owner_email: string | null
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  created_at: string
  contact_count: number
}

export interface PlatformRevenueOverview {
  tier_distribution: Record<SubscriptionTier, number>
  status_distribution: Record<SubscriptionStatus, number>
  projected_mrr: number
  accounts: RevenueAccount[]
}

// ============================================================
// Campaign Analytics Types
// ============================================================

export interface TemplatePerformance {
  template_name: string
  template_category: string
  campaign_count: number
  total_sent: number
  total_delivered: number
  total_read: number
  total_replied: number
  open_rate: number
  reply_rate: number
}

export interface CampaignVolumePoint {
  day: string
  campaigns_created: number
  messages_sent: number
}

export interface PlatformCampaignAnalytics {
  template_performance: TemplatePerformance[]
  volume_over_time: CampaignVolumePoint[]
  channel_distribution: Record<string, number>
}

// ============================================================
// Engagement Analytics Types
// ============================================================

export interface HeatmapCell {
  day_of_week: number
  hour_of_day: number
  message_count: number
}

export interface ResponseTimePoint {
  day: string
  avg_response_minutes: number | null
}

export interface TopEngagedAccount {
  account_id: string
  account_name: string
  message_count: number
  conversation_count: number
  contact_count: number
}

export interface ConversationResolution {
  total_conversations: number
  resolved_conversations: number
  open_conversations: number
}

export interface PlatformEngagementAnalytics {
  message_heatmap: HeatmapCell[]
  response_time_trend: ResponseTimePoint[]
  top_accounts_by_engagement: TopEngagedAccount[]
  conversation_resolution: ConversationResolution
}

// ============================================================
// Cohort Analytics Types
// ============================================================

export interface CohortRetention {
  cohort_month: string
  total_accounts: number
  active_now: number
  retention_rate: number
}

export interface FeatureAdoption {
  total_accounts: number
  using_whatsapp: number
  using_broadcasts: number
  using_automations: number
  using_campaigns: number
  using_deals: number
}

export interface PlatformCohortAnalytics {
  account_retention: CohortRetention[]
  feature_adoption: FeatureAdoption
}
