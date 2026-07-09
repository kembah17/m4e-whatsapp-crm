import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndustryLearning {
  parameter: string
  old_value: string
  new_value: string
  clients_tested: number
  positive_outcomes: number
  negative_outcomes: number
  avg_improvement_pct: number
  confidence: 'high' | 'medium' | 'low' | 'insufficient'
  recommendation: string
}

export interface ChangeOutcome {
  classification: string
  metric_change_pct: number
}

// ---------------------------------------------------------------------------
// Confidence calculation
// ---------------------------------------------------------------------------

function calculateConfidence(
  clientsTested: number,
  positiveRate: number,
): 'high' | 'medium' | 'low' | 'insufficient' {
  if (clientsTested === 0) return 'insufficient'
  if (clientsTested >= 3 && positiveRate >= 0.75) return 'high'
  if (clientsTested >= 2 && positiveRate >= 0.6) return 'medium'
  if (clientsTested >= 1) return 'low'
  return 'insufficient'
}

function generateRecommendation(
  parameter: string,
  newValue: string,
  confidence: string,
  positiveRate: number,
  avgImprovement: number,
  clientsTested: number,
): string {
  const pctStr = Math.abs(avgImprovement).toFixed(1)

  switch (confidence) {
    case 'high':
      return (
        `Strong evidence: Changing ${parameter} to "${newValue}" improved results ` +
        `by ${pctStr}% across ${clientsTested} clients. Recommend applying to all clients in this industry.`
      )
    case 'medium':
      return (
        `Moderate evidence: ${parameter} = "${newValue}" shows ${(positiveRate * 100).toFixed(0)}% ` +
        `positive outcomes with ${pctStr}% average improvement. Consider applying with monitoring.`
      )
    case 'low':
      return (
        `Limited evidence: ${parameter} = "${newValue}" tested with ${clientsTested} client(s). ` +
        `Results are ${positiveRate > 0.5 ? 'promising' : 'mixed'}. Need more data before recommending.`
      )
    default:
      return (
        `Insufficient data: ${parameter} = "${newValue}" has no outcome data yet. ` +
        `Monitor results before making recommendations.`
      )
  }
}

// ---------------------------------------------------------------------------
// Aggregate industry learnings
// ---------------------------------------------------------------------------

export async function aggregateIndustryLearnings(
  supabase: SupabaseClient,
  industryPreset: string,
): Promise<IndustryLearning[]> {
  // Try RPC first (more efficient)
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('aggregate_preset_learnings', { p_industry: industryPreset })

  if (!rpcError && rpcResult && Array.isArray(rpcResult)) {
    // Transform RPC result into IndustryLearning format
    return rpcResult.map((row: Record<string, unknown>) => {
      const total = Number(row.total_changes ?? 0)
      const positive = Number(row.positive ?? 0)
      const negative = Number(row.negative ?? 0)
      const pending = Number(row.pending ?? 0)
      const avgImprovement = Number(row.avg_improvement_pct ?? 0)

      const evaluated = total - pending
      const positiveRate = evaluated > 0 ? positive / evaluated : 0
      const confidence = calculateConfidence(evaluated, positiveRate)

      const parameter = String(row.parameter_name ?? '')
      const newValue = String(row.new_value ?? '')

      return {
        parameter,
        old_value: '', // RPC groups by new_value, old_value varies
        new_value: newValue,
        clients_tested: total,
        positive_outcomes: positive,
        negative_outcomes: negative,
        avg_improvement_pct: Math.round(avgImprovement * 10) / 10,
        confidence,
        recommendation: generateRecommendation(
          parameter,
          newValue,
          confidence,
          positiveRate,
          avgImprovement,
          total,
        ),
      }
    })
  }

  // Fallback: manual query
  const { data: configs } = await supabase
    .from('funnel_configs')
    .select('id')
    .eq('industry_preset', industryPreset)

  if (!configs || configs.length === 0) return []

  const configIds = configs.map(c => c.id)

  const { data: changes } = await supabase
    .from('preset_change_log')
    .select('*')
    .in('funnel_config_id', configIds)
    .order('changed_at', { ascending: false })

  if (!changes || changes.length === 0) return []

  // Group by parameter_name + new_value
  const groups = new Map<string, typeof changes>()
  for (const change of changes) {
    const key = `${change.parameter_name}::${change.new_value}`
    const group = groups.get(key) ?? []
    group.push(change)
    groups.set(key, group)
  }

  const learnings: IndustryLearning[] = []

  for (const [, group] of groups) {
    const first = group[0]
    const total = group.length
    const positive = group.filter(c => c.outcome_classification === 'positive').length
    const negative = group.filter(c => c.outcome_classification === 'negative').length
    const pending = group.filter(c => !c.outcome_classification).length

    const evaluated = total - pending
    const positiveRate = evaluated > 0 ? positive / evaluated : 0

    // Calculate average improvement
    const improvements = group
      .filter(c => c.outcome_value != null && c.baseline_value != null && c.baseline_value !== 0)
      .map(c => ((c.outcome_value - c.baseline_value) / c.baseline_value) * 100)

    const avgImprovement =
      improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0

    const confidence = calculateConfidence(evaluated, positiveRate)

    learnings.push({
      parameter: first.parameter_name,
      old_value: first.old_value ?? '',
      new_value: first.new_value ?? '',
      clients_tested: total,
      positive_outcomes: positive,
      negative_outcomes: negative,
      avg_improvement_pct: Math.round(avgImprovement * 10) / 10,
      confidence,
      recommendation: generateRecommendation(
        first.parameter_name,
        first.new_value ?? '',
        confidence,
        positiveRate,
        avgImprovement,
        total,
      ),
    })
  }

  // Sort by positive outcomes descending
  learnings.sort((a, b) => b.positive_outcomes - a.positive_outcomes)

  return learnings
}

// ---------------------------------------------------------------------------
// Evaluate change outcomes
// ---------------------------------------------------------------------------

export async function evaluateChangeOutcomes(
  supabase: SupabaseClient,
  changeId: string,
): Promise<ChangeOutcome> {
  const { data: change, error } = await supabase
    .from('preset_change_log')
    .select('*')
    .eq('id', changeId)
    .single()

  if (error || !change) {
    throw new Error(`Change not found: ${changeId}`)
  }

  // If already classified, return existing
  if (change.outcome_classification) {
    const pct =
      change.baseline_value && change.baseline_value !== 0 && change.outcome_value != null
        ? ((change.outcome_value - change.baseline_value) / change.baseline_value) * 100
        : 0
    return {
      classification: change.outcome_classification,
      metric_change_pct: Math.round(pct * 10) / 10,
    }
  }

  // Check if enough time has passed (at least 7 days)
  const changedAt = new Date(change.changed_at)
  const daysSinceChange = Math.floor((Date.now() - changedAt.getTime()) / 86400000)

  if (daysSinceChange < 7) {
    return {
      classification: 'too_early',
      metric_change_pct: 0,
    }
  }

  // Get metrics for the period after the change
  const configId = change.funnel_config_id
  const { data: config } = await supabase
    .from('funnel_configs')
    .select('account_id')
    .eq('id', configId)
    .single()

  if (!config) {
    return { classification: 'no_data', metric_change_pct: 0 }
  }

  // Compare metrics before and after change
  const beforeStart = new Date(changedAt)
  beforeStart.setDate(beforeStart.getDate() - 14)

  const afterEnd = new Date(changedAt)
  afterEnd.setDate(afterEnd.getDate() + 14)

  const { data: beforeMetrics } = await supabase
    .from('funnel_stage_metrics')
    .select('metric_value')
    .eq('account_id', config.account_id)
    .gte('metric_date', beforeStart.toISOString().split('T')[0])
    .lt('metric_date', changedAt.toISOString().split('T')[0])

  const { data: afterMetrics } = await supabase
    .from('funnel_stage_metrics')
    .select('metric_value')
    .eq('account_id', config.account_id)
    .gte('metric_date', changedAt.toISOString().split('T')[0])
    .lte('metric_date', afterEnd.toISOString().split('T')[0])

  if (!beforeMetrics?.length || !afterMetrics?.length) {
    return { classification: 'insufficient_data', metric_change_pct: 0 }
  }

  const beforeAvg =
    beforeMetrics.reduce((sum, m) => sum + (m.metric_value ?? 0), 0) / beforeMetrics.length
  const afterAvg =
    afterMetrics.reduce((sum, m) => sum + (m.metric_value ?? 0), 0) / afterMetrics.length

  const changePct = beforeAvg !== 0 ? ((afterAvg - beforeAvg) / beforeAvg) * 100 : 0

  let classification: string
  if (changePct > 5) classification = 'positive'
  else if (changePct < -5) classification = 'negative'
  else classification = 'mixed'

  // Update the change log with outcome
  await supabase
    .from('preset_change_log')
    .update({
      outcome_classification: classification,
      baseline_value: beforeAvg,
      outcome_value: afterAvg,
    })
    .eq('id', changeId)

  return {
    classification,
    metric_change_pct: Math.round(changePct * 10) / 10,
  }
}

// ---------------------------------------------------------------------------
// Apply a learning recommendation to an industry preset
// ---------------------------------------------------------------------------

export async function applyPresetUpdate(
  supabase: SupabaseClient,
  industryPreset: string,
  parameter: string,
  newValue: string,
  approvedBy: string,
): Promise<void> {
  // Get all active configs for this industry
  const { data: configs, error } = await supabase
    .from('funnel_configs')
    .select('id, account_id')
    .eq('industry_preset', industryPreset)
    .eq('is_active', true)

  if (error) throw new Error(error.message)
  if (!configs || configs.length === 0) return

  // Update each config with the new parameter value
  for (const config of configs) {
    // Get current value
    const { data: current } = await supabase
      .from('funnel_configs')
      .select(parameter)
      .eq('id', config.id)
      .single()

    const oldValue = current ? String(current[parameter] ?? '') : ''

    // Update the config
    await supabase
      .from('funnel_configs')
      .update({
        [parameter]: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)

    // Log the change
    await supabase.from('preset_change_log').insert({
      funnel_config_id: config.id,
      parameter_name: parameter,
      old_value: oldValue,
      new_value: newValue,
      change_reason: `Industry learning applied by admin (${approvedBy})`,
      changed_by: approvedBy,
    })
  }
}
