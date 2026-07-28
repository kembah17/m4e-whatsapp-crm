// Business Growth Engine Types
// Unified types for all operational features
// Migration: 068_business_growth_engine.sql

// ============================================================
// Nigerian Contact Extensions
// ============================================================
export type ContactType = 'individual' | 'business' | 'wholesale'
export type PreferredLanguage = 'en' | 'pcm' | 'yo' | 'ig' | 'ha' // English, Pidgin, Yoruba, Igbo, Hausa
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface NigerianState {
  id: number
  name: string
  code: string
  geo_zone: string
}

export interface NigerianLGA {
  id: number
  state_id: number
  name: string
}

// Extended contact fields (added to existing Contact interface)
export interface ContactExtensions {
  state?: string | null
  lga?: string | null
  city?: string | null
  address?: string | null
  birthday?: string | null // DATE as ISO string
  occupation?: string | null
  referral_source?: string | null
  referred_by_contact_id?: string | null
  preferred_language?: PreferredLanguage
  contact_type?: ContactType
  trust_score?: number
  trust_score_updated_at?: string | null
  total_spent?: number
  total_orders?: number
  outstanding_balance?: number
  loyalty_points?: number
  loyalty_tier?: LoyaltyTier
}

// ============================================================
// Trust Score
// ============================================================
export interface TrustScoreConfig {
  id: string
  account_id: string
  weight_payment_speed: number
  weight_order_frequency: number
  weight_order_value: number
  weight_communication: number
  weight_referrals: number
  weight_returns: number
  weight_loyalty: number
  high_trust_threshold: number
  low_trust_threshold: number
  auto_recalculate: boolean
  recalculate_interval_days: number
  last_recalculated_at?: string | null
  created_at: string
  updated_at: string
}

export interface TrustScoreHistory {
  id: string
  account_id: string
  contact_id: string
  old_score?: number | null
  new_score?: number | null
  change_reason?: string | null
  details: Record<string, number>
  created_at: string
}

// ============================================================
// Inventory Management
// ============================================================
export type MovementType = 'sale' | 'restock' | 'adjustment' | 'return' | 'damage' | 'transfer'
export type UnitOfMeasure = 'pieces' | 'kg' | 'litres' | 'boxes' | 'cartons' | 'dozen'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type InventoryAlertType = 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring'

// Extended product fields
export interface ProductInventoryExtensions {
  stock_quantity?: number
  reorder_point?: number
  reorder_quantity?: number
  track_inventory?: boolean
  unit_of_measure?: UnitOfMeasure
  supplier_name?: string | null
  supplier_phone?: string | null
  last_restocked_at?: string | null
}

export interface StockMovement {
  id: string
  account_id: string
  product_id: string
  movement_type: MovementType
  quantity: number
  previous_quantity: number
  new_quantity: number
  reference_type?: string | null
  reference_id?: string | null
  notes?: string | null
  branch_id?: string | null
  created_by?: string | null
  created_at: string
  // Joined
  product?: { name: string; sku?: string }
}

export interface InventoryAlert {
  id: string
  account_id: string
  product_id: string
  alert_type: InventoryAlertType
  severity: AlertSeverity
  message: string
  is_resolved: boolean
  resolved_at?: string | null
  resolved_by?: string | null
  created_at: string
  // Joined
  product?: { name: string; stock_quantity?: number; reorder_point?: number }
}

// ============================================================
// Debt / Credit Book
// ============================================================
export type DebtEntryType = 'credit_sale' | 'loan' | 'service_credit' | 'advance_payment' | 'other'
export type DebtStatus = 'outstanding' | 'partial' | 'paid' | 'overdue' | 'written_off' | 'disputed'
export type PaymentMethod = 'bank_transfer' | 'cash' | 'pos' | 'ussd' | 'wallet' | 'card' | 'mobile_money'

export interface DebtEntry {
  id: string
  account_id: string
  contact_id: string
  entry_type: DebtEntryType
  description: string
  original_amount: number
  amount_paid: number
  outstanding: number // computed
  currency: string
  issue_date: string
  due_date?: string | null
  status: DebtStatus
  reminder_enabled: boolean
  reminder_frequency_days: number
  last_reminder_sent_at?: string | null
  next_reminder_at?: string | null
  reminder_count: number
  max_reminders: number
  invoice_id?: string | null
  deal_id?: string | null
  product_id?: string | null
  branch_id?: string | null
  notes?: string | null
  tags: string[]
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined
  contact?: { name?: string; phone?: string | null }
  product?: { name: string }
}

export interface DebtPayment {
  id: string
  account_id: string
  debt_entry_id: string
  contact_id: string
  amount: number
  payment_method: PaymentMethod
  payment_reference?: string | null
  payment_date: string
  proof_url?: string | null
  verified: boolean
  verified_by?: string | null
  verified_at?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
}

// ============================================================
// Installment Plans
// ============================================================
export type InstallmentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom'
export type InstallmentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled'
export type InstallmentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'waived'
export type LateFeeType = 'none' | 'fixed' | 'percentage'

export interface InstallmentPlan {
  id: string
  account_id: string
  contact_id: string
  debt_entry_id?: string | null
  plan_name: string
  total_amount: number
  down_payment: number
  number_of_installments: number
  installment_amount: number
  frequency: InstallmentFrequency
  currency: string
  status: InstallmentPlanStatus
  installments_paid: number
  total_paid: number
  next_due_date?: string | null
  grace_period_days: number
  late_fee_type: LateFeeType
  late_fee_amount: number
  product_id?: string | null
  deal_id?: string | null
  branch_id?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined
  contact?: { name?: string; phone?: string | null }
  product?: { name: string }
  schedule?: InstallmentScheduleEntry[]
}

export interface InstallmentScheduleEntry {
  id: string
  account_id: string
  plan_id: string
  installment_number: number
  amount_due: number
  amount_paid: number
  late_fee: number
  due_date: string
  paid_date?: string | null
  status: InstallmentStatus
  payment_method?: string | null
  payment_reference?: string | null
  proof_url?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Invoices & Quotations
// ============================================================
export type DocType = 'invoice' | 'quotation' | 'proforma' | 'receipt' | 'credit_note'
export type DiscountType = 'none' | 'percentage' | 'fixed'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'expired'

export interface Invoice {
  id: string
  account_id: string
  contact_id: string
  doc_type: DocType
  doc_number: string
  subtotal: number
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number // computed
  currency: string
  issue_date: string
  due_date?: string | null
  valid_until?: string | null
  status: InvoiceStatus
  // Business snapshot
  business_name?: string | null
  business_address?: string | null
  business_phone?: string | null
  business_email?: string | null
  business_logo_url?: string | null
  business_bank_details?: { bank?: string; account_number?: string; account_name?: string }
  // Customer snapshot
  customer_name?: string | null
  customer_address?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  // Content
  notes?: string | null
  terms?: string | null
  footer_text?: string | null
  // References
  deal_id?: string | null
  converted_from_id?: string | null
  branch_id?: string | null
  // Delivery
  sent_via?: string | null
  sent_at?: string | null
  viewed_at?: string | null
  pdf_url?: string | null
  tags: string[]
  metadata: Record<string, unknown>
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined
  contact?: { name?: string; phone?: string | null; email?: string | null }
  items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  tax_rate: number
  line_total: number
  sort_order: number
  notes?: string | null
  created_at: string
  // Joined
  product?: { name: string; sku?: string }
}

// ============================================================
// Price Negotiation History
// ============================================================
export type NegotiationOutcome = 'pending' | 'accepted' | 'rejected' | 'expired' | 'counter_offered'

export interface PriceNegotiation {
  id: string
  account_id: string
  contact_id: string
  product_id?: string | null
  deal_id?: string | null
  original_price: number
  offered_price?: number | null
  counter_price?: number | null
  final_price?: number | null
  discount_percent?: number | null
  negotiation_channel: string
  outcome: NegotiationOutcome
  reason?: string | null
  valid_until?: string | null
  notes?: string | null
  message_id?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined
  contact?: { name?: string }
  product?: { name: string; price: number }
}

// ============================================================
// Voice Note Transcription
// ============================================================
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VoiceTranscription {
  id: string
  account_id: string
  message_id: string
  contact_id?: string | null
  media_url?: string | null
  duration_seconds?: number | null
  transcript?: string | null
  language?: string
  confidence?: number | null
  summary?: string | null
  action_items: Array<{ text: string; priority?: string }>
  sentiment?: string | null
  key_phrases: string[]
  status: TranscriptionStatus
  error_message?: string | null
  processing_time_ms?: number | null
  model_used?: string | null
  cost_usd?: number | null
  created_at: string
}

// ============================================================
// Receipt Scanner
// ============================================================
export type ReceiptStatus = 'pending' | 'processing' | 'matched' | 'unmatched' | 'confirmed' | 'rejected'

export interface ScannedReceipt {
  id: string
  account_id: string
  contact_id?: string | null
  source: string
  media_url: string
  message_id?: string | null
  extracted_amount?: number | null
  extracted_bank?: string | null
  extracted_account_number?: string | null
  extracted_account_name?: string | null
  extracted_reference?: string | null
  extracted_date?: string | null
  extracted_sender?: string | null
  raw_text?: string | null
  confidence?: number | null
  matched_debt_id?: string | null
  matched_invoice_id?: string | null
  matched_installment_id?: string | null
  match_confidence?: number | null
  status: ReceiptStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
  model_used?: string | null
  cost_usd?: number | null
  created_at: string
}

// ============================================================
// AI Business Insights
// ============================================================
export type InsightType = 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation'
export type InsightCategory = 'sales' | 'customers' | 'inventory' | 'payments' | 'engagement' | 'seasonal'
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical'

export interface BusinessInsight {
  id: string
  account_id: string
  insight_type: InsightType
  category: InsightCategory
  title: string
  description: string
  metric_name?: string | null
  metric_value?: number | null
  comparison_value?: number | null
  change_percent?: number | null
  priority: InsightPriority
  suggested_action?: string | null
  action_taken: boolean
  action_taken_at?: string | null
  valid_from?: string
  valid_until?: string | null
  is_dismissed: boolean
  dismissed_at?: string | null
  data_points?: number | null
  confidence?: number | null
  model_used?: string | null
  cost_usd?: number | null
  created_at: string
}

// ============================================================
// Referral Tracking
// ============================================================
export type ReferralStatus = 'pending' | 'contacted' | 'converted' | 'expired' | 'rewarded'
export type ReferralRewardType = 'points' | 'discount_percent' | 'discount_fixed' | 'cashback' | 'custom'

export interface ReferralConfig {
  id: string
  account_id: string
  is_active: boolean
  reward_type: ReferralRewardType
  reward_value: number
  reward_currency: string
  require_purchase: boolean
  min_purchase_amount: number
  max_referrals_per_month: number
  referral_message_template: string
  thank_you_message: string
  created_at: string
  updated_at: string
}

export interface Referral {
  id: string
  account_id: string
  referrer_contact_id: string
  referred_contact_id?: string | null
  referral_code?: string | null
  channel: string
  status: ReferralStatus
  converted_at?: string | null
  reward_type?: string | null
  reward_value?: number | null
  reward_issued: boolean
  reward_issued_at?: string | null
  first_purchase_amount?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
  // Joined
  referrer?: { name?: string; phone?: string | null }
  referred?: { name?: string; phone?: string | null }
}

// ============================================================
// Loyalty Programme
// ============================================================
export type LoyaltyTransactionType = 'earn_purchase' | 'earn_referral' | 'earn_review' | 'earn_birthday' | 'earn_bonus' | 'redeem' | 'expire' | 'adjust'

export interface LoyaltyConfig {
  id: string
  account_id: string
  is_active: boolean
  programme_name: string
  points_per_naira: number
  points_per_referral: number
  points_per_review: number
  birthday_bonus_points: number
  silver_threshold: number
  gold_threshold: number
  platinum_threshold: number
  silver_discount_percent: number
  gold_discount_percent: number
  platinum_discount_percent: number
  points_to_naira_rate: number
  min_redemption_points: number
  points_expire: boolean
  points_expiry_months: number
  created_at: string
  updated_at: string
}

export interface LoyaltyTransaction {
  id: string
  account_id: string
  contact_id: string
  transaction_type: LoyaltyTransactionType
  points: number
  balance_after: number
  description: string
  reference_type?: string | null
  reference_id?: string | null
  expires_at?: string | null
  created_by?: string | null
  created_at: string
  // Joined
  contact?: { name?: string }
}

// ============================================================
// Feature Access / Tier Gating
// ============================================================
export type FeatureTier = 'starter' | 'professional' | 'business' | 'enterprise'

export interface FeatureAccessConfig {
  id: string
  account_id: string
  current_tier: FeatureTier
  feature_overrides: Record<string, boolean>
  max_contacts: number
  max_broadcasts_per_month: number
  max_campaigns: number
  max_invoices_per_month: number
  max_ai_queries_per_day: number
  max_team_members: number
  max_branches: number
  max_products: number
  max_pipelines: number
  max_automations: number
  max_whatsapp_flows: number
  max_ai_chatbot_msgs_per_month: number
  upsell_prompts_shown: Record<string, string>
  last_upsell_shown_at?: string | null
  upsell_cooldown_days: number
  preview_features: string[]
  preview_expires_at?: string | null
  created_at: string
  updated_at: string
}

// Feature definitions for tier gating
export const FEATURE_TIER_MAP: Record<string, FeatureTier> = {
  // Starter features (always available)
  inbox: 'starter',
  contacts: 'starter',
  quick_replies: 'starter',
  broadcasts: 'starter',
  products: 'starter',
  pipelines: 'starter',
  // Professional features
  debt_book: 'professional',
  invoices: 'professional',
  inventory: 'professional',
  installments: 'professional',
  trust_score: 'professional',
  voice_transcription: 'professional',
  receipt_scanner: 'professional',
  price_negotiation: 'professional',
  // Business features
  referrals: 'business',
  loyalty: 'business',
  ai_insights: 'business',
  campaigns: 'business',
  funnel: 'business',
  ecommerce: 'business',
  // Enterprise features
  public_api: 'enterprise',
  white_label: 'enterprise',
  multi_branch: 'enterprise',
}

// ============================================================
// Operational Analytics
// ============================================================
export interface OperationalSnapshot {
  id: string
  account_id: string
  snapshot_date: string
  total_revenue: number
  total_orders: number
  average_order_value: number
  total_outstanding: number
  total_overdue: number
  debt_entries_count: number
  overdue_entries_count: number
  total_products: number
  low_stock_count: number
  out_of_stock_count: number
  inventory_value: number
  total_contacts: number
  new_contacts: number
  active_contacts: number
  avg_trust_score: number
  messages_sent: number
  messages_received: number
  response_rate: number
  avg_response_time_minutes: number
  total_loyalty_points_issued: number
  total_loyalty_points_redeemed: number
  active_loyalty_members: number
  total_referrals: number
  converted_referrals: number
  referral_revenue: number
  branch_id?: string | null
  created_at: string
}

// ============================================================
// Operational Dashboard Summary (from RPC)
// ============================================================
export interface OperationalSummary {
  debt: {
    total_outstanding: number
    total_overdue: number
    entries_count: number
    overdue_count: number
  }
  inventory: {
    total_products: number
    tracked_products: number
    low_stock: number
    out_of_stock: number
    total_value: number
  }
  invoices: {
    total_unpaid: number
    total_overdue: number
    pending_count: number
    this_month_revenue: number
  }
  loyalty: {
    active_members: number
    total_points_outstanding: number
    avg_trust_score: number
  }
  referrals: {
    total: number
    converted: number
    pending: number
    conversion_rate: number
  }
  installments: {
    active_plans: number
    total_expected: number
    overdue_installments: number
  }
}

// ============================================================
// Client Customization Options
// ============================================================
export interface BusinessCustomization {
  // Which Nigerian fields to show/require
  show_state_lga: boolean
  show_birthday: boolean
  show_occupation: boolean
  show_referral_source: boolean
  require_state: boolean
  require_phone: boolean
  // Currency and locale
  default_currency: string
  date_format: string // DD/MM/YYYY or MM/DD/YYYY
  // Industry-specific defaults
  industry: string
  // Debt book settings
  default_reminder_frequency_days: number
  default_max_reminders: number
  default_grace_period_days: number
  // Invoice settings
  invoice_prefix: string
  quotation_prefix: string
  default_payment_terms: string
  default_tax_rate: number
  show_tax: boolean
  // Inventory settings
  default_reorder_point: number
  low_stock_alert_enabled: boolean
  // Loyalty settings
  loyalty_programme_name: string
}


// ============================================================
// Support Desk
// ============================================================
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'escalated' | 'resolved' | 'closed'
export type TicketPriority = 'critical' | 'high' | 'normal' | 'low'
export type TicketSource = 'whatsapp' | 'manual' | 'ai_handoff' | 'sentiment_escalation' | 'email'
export type TicketMessageType = 'reply' | 'internal_note' | 'status_change' | 'assignment' | 'escalation' | 'sla_warning' | 'resolution'

export interface TicketCategory {
  id: string
  account_id: string
  name: string
  description?: string | null
  icon: string
  color: string
  auto_assign_to?: string | null
  sla_policy_id?: string | null
  is_active: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface SLAPolicy {
  id: string
  account_id: string
  name: string
  description?: string | null
  priority: TicketPriority
  first_response_minutes: number
  resolution_minutes: number
  escalation_minutes?: number | null
  escalate_to?: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupportTicket {
  id: string
  account_id: string
  ticket_number: string
  contact_id?: string | null
  conversation_id?: string | null
  category_id?: string | null
  sla_policy_id?: string | null
  subject: string
  description?: string | null
  status: TicketStatus
  priority: TicketPriority
  source: TicketSource
  assigned_to?: string | null
  escalated_to?: string | null
  escalated_at?: string | null
  escalation_reason?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  closed_at?: string | null
  sla_first_response_due?: string | null
  sla_resolution_due?: string | null
  sla_first_response_breached: boolean
  sla_resolution_breached: boolean
  ai_suggested_category?: string | null
  ai_suggested_priority?: string | null
  ai_confidence?: number | null
  sentiment_score?: number | null
  tags: string[]
  metadata: Record<string, unknown>
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined fields
  contact?: { id: string; name: string; phone: string } | null
  category?: TicketCategory | null
  assigned_profile?: { id: string; full_name: string; avatar_url?: string } | null
  sla_policy?: SLAPolicy | null
  message_count?: number
}

export interface TicketMessage {
  id: string
  account_id: string
  ticket_id: string
  sender_id?: string | null
  sender_type: 'agent' | 'customer' | 'system' | 'ai'
  message_type: TicketMessageType
  content: string
  attachments: Array<{ name: string; url: string; type: string }>
  is_internal: boolean
  sent_via_whatsapp: boolean
  whatsapp_message_id?: string | null
  created_at: string
  // Joined
  sender?: { id: string; full_name: string; avatar_url?: string } | null
}

export interface TicketSatisfaction {
  id: string
  account_id: string
  ticket_id: string
  contact_id?: string | null
  rating?: number | null
  feedback?: string | null
  survey_sent_at?: string | null
  responded_at?: string | null
  created_at: string
}
