// Optimization Feedback Types
// Phase 3 of the Optimization Hub: connects learning systems to config editors

// ============================================================
// Optimization Insights
// ============================================================
export type InsightType =
  | 'performance_gap'
  | 'trend_decline'
  | 'trend_improvement'
  | 'ab_result'
  | 'suggestion'
  | 'anomaly'
  | 'benchmark_comparison'

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success'

export type InsightStatus = 'open' | 'acknowledged' | 'applied' | 'dismissed'

export interface OptimizationInsight {
  id: string
  entity_type: 'package_config' | 'campaign_template'
  entity_id: string
  entity_name: string
  config_version_id: string | null
  insight_type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  metrics: InsightMetrics
  suggested_action: string | null
  suggested_config_change: SuggestedChange | null
  status: InsightStatus
  applied_at: string | null
  applied_by: string | null
  dismissed_reason: string | null
  created_at: string
  updated_at: string
}

export interface InsightMetrics {
  metric?: string
  expected?: number
  actual?: number
  gap_pct?: number
  trend_direction?: 'up' | 'down' | 'flat'
  trend_pct?: number
  period_days?: number
  sample_size?: number
  confidence?: number
  benchmark?: number
  [key: string]: unknown
}

export interface SuggestedChange {
  field: string
  current_value?: unknown
  suggestion: string
  expected_impact?: string
}

// ============================================================
// Performance Snapshots
// ============================================================
export interface PerformanceSnapshot {
  id: string
  entity_type: 'package_config' | 'campaign_template'
  entity_id: string
  config_version_id: string | null
  period_start: string
  period_end: string
  campaigns_launched: number
  total_sent: number
  total_delivered: number
  total_read: number
  total_replied: number
  total_converted: number
  total_revenue: number
  delivery_rate: number | null
  read_rate: number | null
  reply_rate: number | null
  conversion_rate: number | null
  revenue_per_message: number | null
  active_clients: number | null
  milestone_completion_rate: number | null
  avg_client_satisfaction: number | null
  churn_rate: number | null
  raw_metrics: Record<string, unknown>
  created_at: string
}

// ============================================================
// A/B Tests
// ============================================================
export type ABTestStatus = 'draft' | 'running' | 'completed' | 'inconclusive' | 'cancelled'

export interface ABTest {
  id: string
  name: string
  description: string | null
  entity_type: 'package_config' | 'campaign_template'
  entity_id: string
  variant_a_version_id: string | null
  variant_a_label: string
  variant_a_snapshot_id: string | null
  variant_b_version_id: string | null
  variant_b_label: string
  variant_b_snapshot_id: string | null
  primary_metric: string
  min_sample_size: number
  confidence_level: number
  status: ABTestStatus
  winner: 'a' | 'b' | 'tie' | null
  lift_percentage: number | null
  statistical_significance: number | null
  result_summary: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Joined
  variant_a_snapshot?: PerformanceSnapshot
  variant_b_snapshot?: PerformanceSnapshot
}

// ============================================================
// Feedback Panel Props & Aggregations
// ============================================================
export interface FeedbackSummary {
  entity_type: 'package_config' | 'campaign_template'
  entity_id: string
  entity_name: string
  open_insights: number
  critical_insights: number
  warning_insights: number
  success_insights: number
  active_ab_tests: number
  latest_snapshot: PerformanceSnapshot | null
  performance_trend: TrendData[]
  top_insights: OptimizationInsight[]
}

export interface TrendData {
  date: string
  delivery_rate: number | null
  read_rate: number | null
  reply_rate: number | null
  conversion_rate: number | null
  revenue: number
  campaigns: number
}

export interface FeedbackPanelProps {
  entityType: 'package_config' | 'campaign_template'
  entityId: string
  entityName: string
  expectedRates?: {
    open_rate?: number | null
    reply_rate?: number | null
    conversion_rate?: number | null
  }
}
