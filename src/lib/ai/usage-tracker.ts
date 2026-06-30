// ============================================================
// AI Usage Tracker — non-blocking cost monitoring.
//
// Wraps AI API calls to automatically track token usage and
// estimated costs. Uses fire-and-forget DB inserts so tracking
// never slows down the actual AI response.
// ============================================================

import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

// Gemini 2.0 Flash pricing (per 1K tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  'google/gemini-2.0-flash-001': { input: 0.0001, output: 0.0004 },
  'google/gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  // Fallback for unknown models
  default: { input: 0.0002, output: 0.0006 },
}

export type AIFeature = 'chatbot' | 'sentiment' | 'bulk_tagging' | 'ghostwriter' | 'intent_detection'

interface TrackUsageInput {
  accountId: string
  feature: AIFeature
  model?: string
  inputTokens: number
  outputTokens: number
  metadata?: Record<string, unknown>
}

/**
 * Calculate estimated cost in USD based on model pricing.
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model] || PRICING.default
  const inputCost = (inputTokens / 1000) * pricing.input
  const outputCost = (outputTokens / 1000) * pricing.output
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000 // 6 decimal places
}

/**
 * Track an AI API call. Fire-and-forget — never throws.
 */
export function trackAIUsage(input: TrackUsageInput): void {
  const model = input.model || 'gemini-2.0-flash'
  const cost = estimateCost(model, input.inputTokens, input.outputTokens)

  // Fire-and-forget insert
  supabaseAdmin()
    .from('ai_usage_log')
    .insert({
      account_id: input.accountId,
      feature: input.feature,
      model,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      estimated_cost_usd: cost,
      metadata: input.metadata || {},
    })
    .then(({ error }: { error: unknown }) => {
      if (error) {
        console.error('[ai-usage-tracker] insert failed:', error)
      }
    })
    .catch((err: unknown) => {
      console.error('[ai-usage-tracker] unexpected error:', err)
    })
}

/**
 * Check if an account has exceeded its AI budget.
 * Returns { exceeded: boolean, currentCost: number, budget: number }
 */
export async function checkAIBudget(
  accountId: string
): Promise<{ exceeded: boolean; currentCost: number; budget: number; alertThreshold: boolean }> {
  const db = supabaseAdmin()

  // Get budget settings
  const { data: settings } = await db
    .from('ai_budget_settings')
    .select('monthly_budget_usd, alert_threshold_pct, hard_limit_enabled')
    .eq('account_id', accountId)
    .maybeSingle()

  const budget = settings?.monthly_budget_usd ?? 5.0
  const alertPct = settings?.alert_threshold_pct ?? 80
  const hardLimit = settings?.hard_limit_enabled ?? false

  // Get current month cost
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: usage } = await db
    .from('ai_usage_log')
    .select('estimated_cost_usd')
    .eq('account_id', accountId)
    .gte('created_at', startOfMonth.toISOString())

  const currentCost = (usage || []).reduce(
    (sum: number, row: { estimated_cost_usd: number }) => sum + Number(row.estimated_cost_usd),
    0
  )

  const alertThreshold = currentCost >= budget * (alertPct / 100)
  const exceeded = hardLimit && currentCost >= budget

  return { exceeded, currentCost, budget, alertThreshold }
}

/**
 * Extract token counts from an OpenRouter API response.
 */
export function extractTokensFromResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: data?.usage?.prompt_tokens || 0,
    outputTokens: data?.usage?.completion_tokens || 0,
  }
}
