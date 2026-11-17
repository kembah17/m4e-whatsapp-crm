// Feedback Aggregation Engine
// Phase 3 of the Optimization Hub: connects learning systems to config editors
// Compares actual vs expected performance, generates insights, tracks trends

import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  OptimizationInsight,
  InsightType,
  InsightSeverity,
  InsightMetrics,
  SuggestedChange,
  PerformanceSnapshot,
  FeedbackSummary,
  TrendData,
} from '@/types/optimization-feedback'

type EntityType = 'package_config' | 'campaign_template'

// ============================================================
// Performance Gap Analysis
// ============================================================

interface GapResult {
  metric: string
  expected: number
  actual: number
  gap_pct: number
  severity: InsightSeverity
}

/**
 * Compare actual campaign performance against expected rates in template
 */
export function analyzePerformanceGaps(
  expected: { open_rate?: number | null; reply_rate?: number | null; conversion_rate?: number | null },
  actual: { read_rate?: number | null; reply_rate?: number | null; conversion_rate?: number | null },
): GapResult[] {
  const gaps: GapResult[] = []

  const checks: { metric: string; exp: number | null | undefined; act: number | null | undefined }[] = [
    { metric: 'open_rate', exp: expected.open_rate, act: actual.read_rate },
    { metric: 'reply_rate', exp: expected.reply_rate, act: actual.reply_rate },
    { metric: 'conversion_rate', exp: expected.conversion_rate, act: actual.conversion_rate },
  ]

  for (const { metric, exp, act } of checks) {
    if (exp == null || act == null || exp === 0) continue

    const gap_pct = ((act - exp) / exp) * 100

    // Determine severity based on gap magnitude
    let severity: InsightSeverity = 'info'
    if (gap_pct <= -50) severity = 'critical'
    else if (gap_pct <= -25) severity = 'warning'
    else if (gap_pct >= 25) severity = 'success'

    // Only report significant gaps (>10%)
    if (Math.abs(gap_pct) > 10) {
      gaps.push({ metric, expected: exp, actual: act, gap_pct, severity })
    }
  }

  return gaps
}

// ============================================================
// Trend Detection
// ============================================================

interface TrendResult {
  metric: string
  direction: 'up' | 'down' | 'flat'
  change_pct: number
  period_days: number
}

/**
 * Detect trends from performance snapshots
 */
export function detectTrends(snapshots: PerformanceSnapshot[]): TrendResult[] {
  if (snapshots.length < 2) return []

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
  )

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const periodDays = Math.ceil(
    (new Date(last.period_end).getTime() - new Date(first.period_start).getTime()) / (1000 * 60 * 60 * 24)
  )

  const trends: TrendResult[] = []
  const metrics: { key: string; getter: (s: PerformanceSnapshot) => number | null }[] = [
    { key: 'delivery_rate', getter: (s) => s.delivery_rate },
    { key: 'read_rate', getter: (s) => s.read_rate },
    { key: 'reply_rate', getter: (s) => s.reply_rate },
    { key: 'conversion_rate', getter: (s) => s.conversion_rate },
    { key: 'revenue_per_message', getter: (s) => s.revenue_per_message },
  ]

  for (const { key, getter } of metrics) {
    const firstVal = getter(first)
    const lastVal = getter(last)
    if (firstVal == null || lastVal == null || firstVal === 0) continue

    const change_pct = ((lastVal - firstVal) / firstVal) * 100
    let direction: 'up' | 'down' | 'flat' = 'flat'
    if (change_pct > 5) direction = 'up'
    else if (change_pct < -5) direction = 'down'

    if (direction !== 'flat') {
      trends.push({ metric: key, direction, change_pct, period_days: periodDays })
    }
  }

  return trends
}

// ============================================================
// Suggestion Generator
// ============================================================

interface SuggestionInput {
  gaps: GapResult[]
  trends: TrendResult[]
  entityName: string
  entityType: EntityType
}

interface GeneratedInsight {
  insight_type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  metrics: InsightMetrics
  suggested_action: string | null
  suggested_config_change: SuggestedChange | null
}

const METRIC_LABELS: Record<string, string> = {
  open_rate: 'Open Rate',
  read_rate: 'Read Rate',
  reply_rate: 'Reply Rate',
  conversion_rate: 'Conversion Rate',
  delivery_rate: 'Delivery Rate',
  revenue_per_message: 'Revenue per Message',
}

/**
 * Generate optimization insights from gaps and trends
 */
export function generateInsights(input: SuggestionInput): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []

  // Performance gap insights
  for (const gap of input.gaps) {
    const label = METRIC_LABELS[gap.metric] || gap.metric
    const direction = gap.gap_pct > 0 ? 'above' : 'below'
    const absGap = Math.abs(gap.gap_pct).toFixed(1)

    if (gap.gap_pct < 0) {
      // Underperforming
      const suggestions = getMetricSuggestions(gap.metric, 'underperform')
      insights.push({
        insight_type: 'performance_gap',
        severity: gap.severity,
        title: `${label} is ${absGap}% below expected`,
        description: `"${input.entityName}" has an actual ${label.toLowerCase()} of ${(gap.actual * 100).toFixed(1)}% vs expected ${(gap.expected * 100).toFixed(1)}%. This ${absGap}% gap suggests the ${input.entityType === 'campaign_template' ? 'message content or targeting' : 'package configuration'} needs optimization.`,
        metrics: {
          metric: gap.metric,
          expected: gap.expected,
          actual: gap.actual,
          gap_pct: gap.gap_pct,
        },
        suggested_action: suggestions.action,
        suggested_config_change: suggestions.change,
      })
    } else {
      // Overperforming
      insights.push({
        insight_type: 'performance_gap',
        severity: 'success',
        title: `${label} is ${absGap}% above expected`,
        description: `"${input.entityName}" is outperforming expectations with ${(gap.actual * 100).toFixed(1)}% ${label.toLowerCase()} vs ${(gap.expected * 100).toFixed(1)}% expected. Consider updating the expected rate and using this as a benchmark.`,
        metrics: {
          metric: gap.metric,
          expected: gap.expected,
          actual: gap.actual,
          gap_pct: gap.gap_pct,
        },
        suggested_action: `Update expected ${label.toLowerCase()} to ${(gap.actual * 100).toFixed(1)}% to reflect actual performance.`,
        suggested_config_change: {
          field: `expected_${gap.metric}`,
          current_value: gap.expected,
          suggestion: `Update to ${gap.actual.toFixed(4)}`,
          expected_impact: 'More accurate forecasting',
        },
      })
    }
  }

  // Trend insights
  for (const trend of input.trends) {
    const label = METRIC_LABELS[trend.metric] || trend.metric
    const absChange = Math.abs(trend.change_pct).toFixed(1)

    if (trend.direction === 'down') {
      insights.push({
        insight_type: 'trend_decline',
        severity: trend.change_pct < -20 ? 'warning' : 'info',
        title: `${label} declining ${absChange}% over ${trend.period_days} days`,
        description: `"${input.entityName}" shows a ${absChange}% decline in ${label.toLowerCase()} over the past ${trend.period_days} days. This may indicate audience fatigue, market changes, or content staleness.`,
        metrics: {
          metric: trend.metric,
          trend_direction: 'down',
          trend_pct: trend.change_pct,
          period_days: trend.period_days,
        },
        suggested_action: trend.change_pct < -20
          ? `Urgent: Review and refresh ${input.entityType === 'campaign_template' ? 'message content and audience targeting' : 'package deliverables and pricing'}.`
          : `Monitor closely. Consider A/B testing new variations.`,
        suggested_config_change: null,
      })
    } else {
      insights.push({
        insight_type: 'trend_improvement',
        severity: 'success',
        title: `${label} improving ${absChange}% over ${trend.period_days} days`,
        description: `"${input.entityName}" shows a ${absChange}% improvement in ${label.toLowerCase()} over the past ${trend.period_days} days. Current strategy is working well.`,
        metrics: {
          metric: trend.metric,
          trend_direction: 'up',
          trend_pct: trend.change_pct,
          period_days: trend.period_days,
        },
        suggested_action: 'Document what changed and apply similar patterns to other templates.',
        suggested_config_change: null,
      })
    }
  }

  return insights
}

/**
 * Get metric-specific optimization suggestions
 */
function getMetricSuggestions(
  metric: string,
  _direction: 'underperform' | 'overperform'
): { action: string; change: SuggestedChange | null } {
  switch (metric) {
    case 'open_rate':
    case 'read_rate':
      return {
        action: 'Improve message preview text. Use personalization (customer name, business name). Send at optimal times (10am-2pm for Nigerian market). Test shorter, more compelling opening lines.',
        change: {
          field: 'message_templates[0].body',
          suggestion: 'Add personalization tokens and compelling opening hook',
          expected_impact: '15-30% improvement in open rates',
        },
      }
    case 'reply_rate':
      return {
        action: 'Add clear call-to-action questions. Use conversational tone. Include time-limited offers. Reduce message length. Test different CTA styles (question vs. instruction).',
        change: {
          field: 'message_templates',
          suggestion: 'End messages with a direct question or simple reply instruction',
          expected_impact: '20-40% improvement in reply rates',
        },
      }
    case 'conversion_rate':
      return {
        action: 'Strengthen the offer. Add social proof. Create urgency. Simplify the conversion path. Test different discount levels or value propositions.',
        change: {
          field: 'sequence_steps',
          suggestion: 'Add a follow-up step with stronger offer for non-converters',
          expected_impact: '10-25% improvement in conversion rates',
        },
      }
    default:
      return {
        action: 'Review recent changes and compare with historical performance.',
        change: null,
      }
  }
}

// ============================================================
// Database Operations
// ============================================================

/**
 * Fetch performance data for a campaign template
 */
export async function getTemplatePerformance(
  templateId: string
): Promise<{
  actual: { read_rate: number | null; reply_rate: number | null; conversion_rate: number | null; total_sent: number }
  snapshots: PerformanceSnapshot[]
}> {
  const db = supabaseAdmin()

  // Get aggregate performance from campaigns using this template
  const { data: campaigns } = await db
    .from('campaigns')
    .select('id, status, total_audience')
    .eq('template_id', templateId)
    .in('status', ['completed', 'active'])

  if (!campaigns || campaigns.length === 0) {
    return {
      actual: { read_rate: null, reply_rate: null, conversion_rate: null, total_sent: 0 },
      snapshots: [],
    }
  }

  const campaignIds = campaigns.map((c) => c.id)

  // Get aggregated events
  const { data: events } = await db
    .from('campaign_events')
    .select('event_type, revenue_amount')
    .in('campaign_id', campaignIds)

  const counts: Record<string, number> = {}
  let totalRevenue = 0
  for (const e of events ?? []) {
    counts[e.event_type] = (counts[e.event_type] || 0) + 1
    if (e.revenue_amount) totalRevenue += Number(e.revenue_amount)
  }

  const sent = counts['sent'] || 0
  const read = counts['read'] || 0
  const replied = counts['replied'] || 0
  const converted = counts['converted'] || 0

  // Get existing snapshots
  const { data: snapshots } = await db
    .from('performance_snapshots')
    .select('*')
    .eq('entity_type', 'campaign_template')
    .eq('entity_id', templateId)
    .order('period_start', { ascending: true })
    .limit(30)

  return {
    actual: {
      read_rate: sent > 0 ? read / sent : null,
      reply_rate: sent > 0 ? replied / sent : null,
      conversion_rate: sent > 0 ? converted / sent : null,
      total_sent: sent,
    },
    snapshots: (snapshots ?? []) as PerformanceSnapshot[],
  }
}

/**
 * Fetch performance data for a package config
 */
export async function getPackagePerformance(
  packageId: string
): Promise<{
  activeClients: number
  milestoneCompletion: number | null
  snapshots: PerformanceSnapshot[]
}> {
  const db = supabaseAdmin()

  // Get active subscriptions for this package
  const { data: subs } = await db
    .from('account_packages')
    .select('account_id, status')
    .eq('package_id', packageId)
    .eq('status', 'active')

  const activeClients = subs?.length ?? 0

  // Get milestone completion
  const { data: milestones } = await db
    .from('package_milestones')
    .select('status')
    .eq('package_id', packageId)

  let milestoneCompletion: number | null = null
  if (milestones && milestones.length > 0) {
    const completed = milestones.filter((m) => m.status === 'completed').length
    milestoneCompletion = completed / milestones.length
  }

  // Get existing snapshots
  const { data: snapshots } = await db
    .from('performance_snapshots')
    .select('*')
    .eq('entity_type', 'package_config')
    .eq('entity_id', packageId)
    .order('period_start', { ascending: true })
    .limit(30)

  return {
    activeClients,
    milestoneCompletion,
    snapshots: (snapshots ?? []) as PerformanceSnapshot[],
  }
}

/**
 * Get existing insights for an entity
 */
export async function getInsights(
  entityType: EntityType,
  entityId: string,
  statusFilter?: string[]
): Promise<OptimizationInsight[]> {
  const db = supabaseAdmin()

  let query = db
    .from('optimization_insights')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (statusFilter && statusFilter.length > 0) {
    query = query.in('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as OptimizationInsight[]
}

/**
 * Save generated insights to database
 */
export async function saveInsights(
  entityType: EntityType,
  entityId: string,
  entityName: string,
  insights: GeneratedInsight[]
): Promise<OptimizationInsight[]> {
  if (insights.length === 0) return []

  const db = supabaseAdmin()

  const rows = insights.map((i) => ({
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    insight_type: i.insight_type,
    severity: i.severity,
    title: i.title,
    description: i.description,
    metrics: i.metrics,
    suggested_action: i.suggested_action,
    suggested_config_change: i.suggested_config_change,
    status: 'open' as const,
  }))

  const { data, error } = await db
    .from('optimization_insights')
    .insert(rows)
    .select()

  if (error) throw error
  return (data ?? []) as OptimizationInsight[]
}

/**
 * Update insight status
 */
export async function updateInsightStatus(
  insightId: string,
  status: 'acknowledged' | 'applied' | 'dismissed',
  extra?: { applied_by?: string; dismissed_reason?: string }
): Promise<void> {
  const db = supabaseAdmin()

  const update: Record<string, unknown> = { status }
  if (status === 'applied') update.applied_at = new Date().toISOString()
  if (extra?.applied_by) update.applied_by = extra.applied_by
  if (extra?.dismissed_reason) update.dismissed_reason = extra.dismissed_reason

  const { error } = await db
    .from('optimization_insights')
    .update(update)
    .eq('id', insightId)

  if (error) throw error
}

/**
 * Get complete feedback summary for an entity
 */
export async function getFeedbackSummary(
  entityType: EntityType,
  entityId: string,
  entityName: string,
  expectedRates?: { open_rate?: number | null; reply_rate?: number | null; conversion_rate?: number | null }
): Promise<FeedbackSummary> {
  // Get existing insights
  const allInsights = await getInsights(entityType, entityId)
  const openInsights = allInsights.filter((i) => i.status === 'open')

  // Get performance data
  let latestSnapshot: PerformanceSnapshot | null = null
  const trendData: TrendData[] = []

  if (entityType === 'campaign_template') {
    const perf = await getTemplatePerformance(entityId)

    // Generate new insights if we have data and expected rates
    if (perf.actual.total_sent > 0 && expectedRates) {
      const gaps = analyzePerformanceGaps(expectedRates, perf.actual)
      const trends = detectTrends(perf.snapshots)
      const newInsights = generateInsights({
        gaps,
        trends,
        entityName,
        entityType,
      })

      // Save new insights (avoid duplicates by checking recent titles)
      const recentTitles = new Set(openInsights.map((i) => i.title))
      const uniqueNew = newInsights.filter((i) => !recentTitles.has(i.title))
      if (uniqueNew.length > 0) {
        const saved = await saveInsights(entityType, entityId, entityName, uniqueNew)
        allInsights.push(...saved)
      }
    }

    if (perf.snapshots.length > 0) {
      latestSnapshot = perf.snapshots[perf.snapshots.length - 1]
      for (const s of perf.snapshots) {
        trendData.push({
          date: s.period_start,
          delivery_rate: s.delivery_rate,
          read_rate: s.read_rate,
          reply_rate: s.reply_rate,
          conversion_rate: s.conversion_rate,
          revenue: s.total_revenue,
          campaigns: s.campaigns_launched,
        })
      }
    }
  } else {
    const perf = await getPackagePerformance(entityId)
    if (perf.snapshots.length > 0) {
      latestSnapshot = perf.snapshots[perf.snapshots.length - 1]
    }
  }

  // Get active A/B tests
  const db = supabaseAdmin()
  const { data: abTests } = await db
    .from('ab_tests')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'running')

  const finalInsights = allInsights.filter((i) => i.status === 'open')

  return {
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    open_insights: finalInsights.length,
    critical_insights: finalInsights.filter((i) => i.severity === 'critical').length,
    warning_insights: finalInsights.filter((i) => i.severity === 'warning').length,
    success_insights: finalInsights.filter((i) => i.severity === 'success').length,
    active_ab_tests: abTests?.length ?? 0,
    latest_snapshot: latestSnapshot,
    performance_trend: trendData,
    top_insights: finalInsights.slice(0, 10),
  }
}
