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
