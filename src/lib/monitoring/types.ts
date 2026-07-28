// ============================================================
// System Monitoring Types
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type LogCategory =
  | 'api'
  | 'auth'
  | 'webhook'
  | 'broadcast'
  | 'automation'
  | 'flow'
  | 'ai'
  | 'ecommerce'
  | 'payment'
  | 'system'
  | 'security'
  | 'cron'
  | 'database'

export interface SystemLog {
  id: number
  created_at: string
  level: LogLevel
  category: string
  message: string
  metadata: Record<string, unknown>
  request_id: string | null
  user_id: string | null
  account_id: string | null
  ip_address: string | null
  user_agent: string | null
  duration_ms: number | null
  status_code: number | null
}

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface SystemAlert {
  id: string
  created_at: string
  resolved_at: string | null
  severity: AlertSeverity
  category: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  is_resolved: boolean
  resolved_by: string | null
  auto_resolve_at: string | null
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  duration_ms: number
}

export interface HealthSnapshot {
  id: number
  created_at: string
  status: HealthStatus
  checks: HealthCheck[]
  response_time_ms: number | null
  db_pool_total: number | null
  db_pool_active: number | null
  db_pool_idle: number | null
  memory_used_mb: number | null
  uptime_seconds: number | null
}

export type SecurityEventType =
  | 'brute_force'
  | 'rate_limit'
  | 'unauthorized_access'
  | 'suspicious_payload'
  | 'ip_blocked'
  | 'auth_failure'
  | 'csrf_attempt'
  | 'injection_attempt'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityEvent {
  id: number
  created_at: string
  event_type: string
  severity: SecuritySeverity
  ip_address: string | null
  user_agent: string | null
  path: string | null
  details: Record<string, unknown>
  blocked: boolean
}

export interface ApiMetricsHourly {
  id: number
  hour: string
  endpoint: string
  method: string
  total_requests: number
  error_count: number
  avg_duration_ms: number | null
  p95_duration_ms: number | null
  p99_duration_ms: number | null
  min_duration_ms: number | null
  max_duration_ms: number | null
}

export interface SystemHealthSummary {
  status: string
  last_check: string
  checks: Record<string, unknown>
  response_time_ms: number | null
  memory_used_mb: number | null
  uptime_seconds: number | null
  error_count_1h: number
  total_requests_1h: number
  error_rate_1h: number
  active_alerts: number
  critical_alerts: number
}

export interface ErrorTrend {
  hour: string
  total: number
  errors: number
  fatals: number
  warnings: number
}

export interface SecuritySummary {
  total_events: number
  blocked_count: number
  unique_ips: number
  by_severity: Record<string, number>
  by_type: Record<string, number>
  top_ips: Array<{
    ip: string
    event_count: number
    blocked_count: number
  }>
}

export type MonitoringTimeRange = '1h' | '6h' | '24h' | '7d'

export function timeRangeToHours(range: MonitoringTimeRange): number {
  switch (range) {
    case '1h': return 1
    case '6h': return 6
    case '24h': return 24
    case '7d': return 168
  }
}


// ============================================================
// Usage Limits Monitoring Types
// ============================================================

export interface AccountLimitUsage {
  account_id: string
  account_name: string
  subscription_tier: string
  subscription_status: string
  current_tier: string
  // Contacts
  max_contacts: number
  current_contacts: number
  // Team Members
  max_team_members: number
  current_team_members: number
  // Branches
  max_branches: number
  current_branches: number
  // Pipelines
  max_pipelines: number
  current_pipelines: number
  // Products
  max_products: number
  current_products: number
  // Broadcasts
  max_broadcasts_per_month: number
  current_broadcasts_this_month: number
  // Campaigns
  max_campaigns: number
  current_campaigns: number
  // Automations
  max_automations: number
  current_automations: number
  // WhatsApp Flows
  max_whatsapp_flows: number
  current_whatsapp_flows: number
  // AI Chatbot Messages
  max_ai_chatbot_msgs_per_month: number
  current_ai_chatbot_msgs_this_month: number
  // AI Queries
  max_ai_queries_per_day: number
  current_ai_queries_today: number
  // Invoices
  max_invoices_per_month: number
  current_invoices_this_month: number
}

export interface ApproachingLimit {
  account_id: string
  account_name: string
  tier: string
  limit_name: string
  current: number
  max: number
  percentage: number
}

export interface UsageLimitData {
  accounts: AccountLimitUsage[]
  approaching_limits: ApproachingLimit[]
  summary: {
    total_accounts: number
    accounts_at_limit: number
    accounts_approaching_limit: number
  }
}
