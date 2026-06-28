// Campaign Engine Types
// Self-service campaign system with pre-built templates and ROI tracking

// ============================================================
// Campaign Templates
// ============================================================
export type CampaignCategory =
  | 'reactivation'
  | 'cart_recovery'
  | 'post_purchase'
  | 'lifecycle'
  | 'engagement'
  | 'revenue'
  | 'feedback'

export interface CampaignMessageTemplate {
  key: string
  name: string
  body: string
  has_discount: boolean
}

export interface CampaignSequenceStep {
  step: number
  delay_minutes: number
  message_key: string
  condition?: string
  trigger?: string
}

export interface CampaignAudienceFilter {
  segment?: string
  min_days_inactive?: number
  min_purchase_value?: number
  min_days_since_purchase?: number
  has_upsell_products?: boolean
  has_date_field?: string
  min_lifetime_value?: number
  min_purchases?: number
  min_rating?: number
  custom_filter?: Record<string, unknown>
}

export interface CampaignTemplate {
  id: string
  slug: string
  name: string
  description: string
  category: CampaignCategory
  icon: string
  default_channel: 'whatsapp' | 'email' | 'sms' | 'auto'
  message_templates: CampaignMessageTemplate[]
  sequence_steps: CampaignSequenceStep[]
  audience_filter: CampaignAudienceFilter
  expected_open_rate: number | null
  expected_reply_rate: number | null
  expected_conversion_rate: number | null
  tier: 1 | 2 | 3
  is_active: boolean
  sort_order: number
  created_at: string
  // Rich explanatory content (046 migration)
  what_it_does: string | null
  why_you_need_it: string | null
  how_it_works: string | null
  best_for: string | null
  example_result: string | null
}

// ============================================================
// Campaigns (user-launched instances)
// ============================================================
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'

export interface Campaign {
  id: string
  account_id: string
  template_id: string | null
  name: string
  description: string | null
  status: CampaignStatus
  channel: 'whatsapp' | 'email' | 'sms' | 'auto'
  message_templates: CampaignMessageTemplate[]
  sequence_steps: CampaignSequenceStep[]
  audience_filter: CampaignAudienceFilter
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  total_audience: number
  automation_id: string | null
  broadcast_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  template?: CampaignTemplate
  performance?: CampaignPerformance
}

// ============================================================
// Campaign Events & Performance
// ============================================================
export type CampaignEventType =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'replied'
  | 'clicked'
  | 'converted'
  | 'purchased'
  | 'opted_out'
  | 'failed'

export interface CampaignEvent {
  id: string
  account_id: string
  campaign_id: string
  contact_id: string | null
  event_type: CampaignEventType
  revenue_amount: number | null
  purchase_id: string | null
  sequence_step: number | null
  channel: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CampaignPerformance {
  campaign_id: string
  total_sent: number
  total_delivered: number
  total_read: number
  total_replied: number
  total_clicked: number
  total_converted: number
  total_purchased: number
  total_opted_out: number
  total_failed: number
  total_revenue: number
  unique_contacts: number
  delivery_rate: number
  read_rate: number
  reply_rate: number
  conversion_rate: number
}

// ============================================================
// Account Campaign Summary (dashboard)
// ============================================================
export interface AccountCampaignSummary {
  total_campaigns: number
  active_campaigns: number
  completed_campaigns: number
  total_messages_sent: number
  total_revenue_recovered: number
  total_customers_reactivated: number
  avg_conversion_rate: number
  avg_reply_rate: number
}

// ============================================================
// Database Analysis (reactivation wizard)
// ============================================================
export interface DatabaseAnalysisSegment {
  count: number
  label: string
}

export interface DatabaseAnalysisRecommendation {
  campaign: string
  audience_size: number
  estimated_revenue: number
  priority: 'high' | 'medium' | 'low'
}

export interface DatabaseAnalysis {
  total_contacts: number
  contacts_with_purchases: number
  contacts_without_purchases: number
  segments: {
    active: DatabaseAnalysisSegment
    at_risk: DatabaseAnalysisSegment
    dormant: DatabaseAnalysisSegment
  }
  revenue: {
    total_lifetime: number
    avg_purchase_value: number
    dormant_potential: number
  }
  recommendations: (DatabaseAnalysisRecommendation | null)[]
  analyzed_at: string
}

// ============================================================
// Campaign Wizard State
// ============================================================
export type WizardStep = 'analyze' | 'select' | 'customize' | 'audience' | 'schedule' | 'review'

export interface CampaignWizardState {
  step: WizardStep
  analysis: DatabaseAnalysis | null
  selectedTemplate: CampaignTemplate | null
  customizedMessages: CampaignMessageTemplate[]
  audienceFilter: CampaignAudienceFilter
  audienceCount: number
  channel: 'whatsapp' | 'email' | 'sms' | 'auto'
  scheduledAt: string | null
  campaignName: string
}


// ============================================================
// Campaign Triggers (event-driven campaign execution)
// ============================================================
export type TriggerEventType =
  | 'order_placed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'cart_abandoned'
  | 'contact_birthday'
  | 'contact_anniversary'
  | 'purchase_milestone'
  | 'no_purchase_period'
  | 'review_requested'
  | 'referral_made'
  | 'manual'

export interface TriggerConditions {
  min_order_value?: number
  product_category?: string
  customer_segment?: string
  min_cart_value?: number
  days_since_purchase?: number
  purchase_count_threshold?: number
  [key: string]: unknown
}

export interface CampaignTrigger {
  id: string
  account_id: string
  campaign_template_id: string | null
  trigger_event: TriggerEventType
  conditions: TriggerConditions
  delay_minutes: number
  is_active: boolean
  execution_count: number
  last_executed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  campaign_template?: CampaignTemplate
}

export interface CreateCampaignTriggerPayload {
  campaign_template_id: string | null
  trigger_event: TriggerEventType
  conditions?: TriggerConditions
  delay_minutes?: number
  is_active?: boolean
}

// ============================================================
// Campaign Executions (queued messages from triggers)
// ============================================================
export type ExecutionStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled'

export interface CampaignExecution {
  id: string
  account_id: string
  trigger_id: string | null
  campaign_id: string | null
  contact_id: string | null
  status: ExecutionStatus
  scheduled_for: string
  sent_at: string | null
  channel: string
  message_content: Record<string, unknown> | null
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
  // Joined fields
  contact?: { name: string | null; phone: string | null; email: string | null }
  trigger?: CampaignTrigger
}

// ============================================================
// Trigger Engine Types
// ============================================================
export interface TriggerEvent {
  event: TriggerEventType
  account_id: string
  contact_id?: string
  order_id?: string
  cart_id?: string
  metadata?: Record<string, unknown>
}

export interface TriggerContext {
  contact_id?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  order_number?: string
  order_total?: number
  order_status?: string
  cart_url?: string
  cart_total?: number
  product_names?: string[]
  customer_segment?: string
  days_since_last_purchase?: number
  total_purchases?: number
  [key: string]: unknown
}

export interface ComposedMessage {
  channel: string
  body: string
  variables: Record<string, string>
}
