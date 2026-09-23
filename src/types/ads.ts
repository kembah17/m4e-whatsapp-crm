// =============================================================================
// Ads Performance System — TypeScript Types
// =============================================================================

// ---------------------------------------------------------------------------
// Meta API response types
// ---------------------------------------------------------------------------

export interface MetaAdAccount {
  id: string           // e.g., "act_123456"
  name: string
  currency: string
  account_status: number
  business_name?: string
  timezone_name?: string
}

export interface MetaCampaign {
  id: string
  name: string
  objective?: string
  status: string       // ACTIVE, PAUSED, DELETED, ARCHIVED
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
}

export interface MetaAction {
  action_type: string
  value: string
}

export interface MetaInsight {
  date_start: string
  date_stop: string
  impressions: string
  clicks: string
  spend: string
  reach: string
  ctr: string
  cpc: string
  cpm: string
  actions?: MetaAction[]
  campaign_id?: string
  campaign_name?: string
}

export interface MetaPaging {
  cursors: {
    before: string
    after: string
  }
  next?: string
}

export interface MetaApiResponse<T> {
  data: T[]
  paging?: MetaPaging
}

// ---------------------------------------------------------------------------
// Insight fetch options
// ---------------------------------------------------------------------------

export interface InsightOptions {
  since: string        // YYYY-MM-DD
  until: string        // YYYY-MM-DD
  level?: "account" | "campaign" | "adset" | "ad"
  timeIncrement?: number  // 1 = daily, 7 = weekly, etc.
}

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface AdAccount {
  id: string
  account_id: string
  meta_ad_account_id: string
  name: string | null
  currency: string
  account_status: number | null
  business_name: string | null
  timezone_name: string | null
  is_active: boolean
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface AdCampaign {
  id: string
  account_id: string
  ad_account_id: string
  meta_campaign_id: string
  name: string
  objective: string | null
  status: string | null
  daily_budget: number | null
  lifetime_budget: number | null
  start_time: string | null
  stop_time: string | null
  created_at: string
  updated_at: string
}

export interface AdPerformanceSnapshot {
  id: string
  account_id: string
  ad_account_id: string
  campaign_id: string | null
  snapshot_date: string
  impressions: number
  clicks: number
  spend: number
  reach: number
  conversions: number
  ctr: number
  cpc: number
  cpm: number
  cost_per_conversion: number
  actions: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Sync result types
// ---------------------------------------------------------------------------

export interface SyncResult {
  success: boolean
  accounts_synced: number
  campaigns_synced: number
  snapshots_synced: number
  errors: string[]
  duration_ms: number
}

// ---------------------------------------------------------------------------
// Dashboard aggregation types
// ---------------------------------------------------------------------------

export interface PerformanceSummary {
  total_spend: number
  total_impressions: number
  total_clicks: number
  total_reach: number
  total_conversions: number
  avg_ctr: number
  avg_cpc: number
  avg_cpm: number
}

export interface DailyPerformance {
  date: string
  impressions: number
  clicks: number
  spend: number
  reach: number
  conversions: number
}

export interface CampaignPerformanceRow {
  campaign_id: string
  campaign_name: string
  status: string | null
  objective: string | null
  impressions: number
  clicks: number
  spend: number
  reach: number
  conversions: number
  ctr: number
  cpc: number
  cpm: number
}

export type DateRange = "7d" | "14d" | "30d" | "90d" | "custom"

export interface PerformanceQuery {
  date_range: DateRange
  start_date?: string
  end_date?: string
  campaign_id?: string
  ad_account_id?: string
  group_by?: "daily" | "weekly" | "monthly"
}
